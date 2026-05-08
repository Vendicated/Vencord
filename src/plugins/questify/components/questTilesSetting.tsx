/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findComponentByCodeLazy } from "@webpack";
import { useEffect, useMemo, useRef, useState, useStateFromStores } from "@webpack/common";
import type { JSX, SyntheticEvent } from "react";

import { getQuestifySettings, useQuestifySettings } from "../settings/access";
import { defaultQuestTileClaimedColorSetting, defaultQuestTileExpiredColorSetting, defaultQuestTileIgnoredColorSetting, defaultQuestTileUnclaimedColorSetting, type QuestTileColorSetting, type QuestTileGradient } from "../settings/def";
import { rerenderQuests } from "../settings/rerender";
import { getQuestTileClasses, getQuestTileStyle } from "../utils/questTiles";
import { type Quest, QuestStore } from "../utils/types";
import { q } from "../utils/ui";
import { ManaButton, type ManaSelectOption, SettingsCard, SettingsColorPicker, SettingsDescription, SettingsHeader, SettingsRow, SettingsRowItem, SettingsSelect, SettingsSubheader } from "./shared";

const QuestTile = findComponentByCodeLazy(".rowIndex,trackGuildAndChannelMetadata") as React.ComponentType<{
    className?: string;
    quest: Quest;
}>;

const gradientOptions = [
    { label: "Intense Restyle Gradient", value: "intense" },
    { label: "Default Restyle Gradient", value: "default" },
    { label: "Subtle Black Gradient", value: "black" },
    { label: "No Gradient", value: "hide" },
] as const satisfies readonly { label: string, value: QuestTileGradient; }[];

const gradientManaOptions: ManaSelectOption[] = gradientOptions.map(({ label, value }) => ({
    id: value,
    label,
    value,
}));

const preloadManaOptions: ManaSelectOption[] = [
    { id: "true", label: "Load All Quest Assets On Page Load", value: "true" },
    { id: "false", label: "Load Quest Assets During Page Scroll", value: "false" },
];

type QuestTileColorKey =
    | "questTileUnclaimedColor"
    | "questTileClaimedColor"
    | "questTileIgnoredColor"
    | "questTileExpiredColor";

interface QuestTileColorOption {
    key: QuestTileColorKey;
    label: string;
    defaultValue: QuestTileColorSetting;
}

const colorOptions = [
    {
        key: "questTileUnclaimedColor",
        label: "Unclaimed",
        defaultValue: defaultQuestTileUnclaimedColorSetting,
    },
    {
        key: "questTileClaimedColor",
        label: "Claimed",
        defaultValue: defaultQuestTileClaimedColorSetting,
    },
    {
        key: "questTileIgnoredColor",
        label: "Ignored",
        defaultValue: defaultQuestTileIgnoredColorSetting,
    },
    {
        key: "questTileExpiredColor",
        label: "Expired",
        defaultValue: defaultQuestTileExpiredColorSetting,
    },
] as const satisfies readonly QuestTileColorOption[];

const defaultPreviewColorKey: QuestTileColorKey = "questTileUnclaimedColor";

function getRandomQuest(): Quest | null {
    const quests = Array.from(QuestStore.quests.values());
    return quests.length > 0 ? quests[Math.floor(Math.random() * quests.length)] : null;
}

function cloneDummyQuest(quest: Quest, dummyColor: QuestTileColorSetting): Quest & { dummyColor: QuestTileColorSetting; } {
    return {
        ...structuredClone(quest),
        dummyColor,
    };
}

function stopDummyQuestInteraction(event: SyntheticEvent): void {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
}

function DummyQuestTile({
    disabled,
    dummyQuest,
    dummyGradient,
}: {
    disabled?: boolean;
    dummyQuest: Quest & { dummyColor: QuestTileColorSetting; };
    dummyGradient: QuestTileGradient;
}): JSX.Element {
    const blockerRef = useRef<HTMLDivElement>(null);
    const classes = getQuestTileClasses(q("dummy-quest"), dummyQuest, dummyGradient);
    const style = getQuestTileStyle(dummyQuest);

    useEffect(() => {
        const blocker = blockerRef.current;

        if (!blocker) return;

        const eventNames = [
            "auxclick",
            "click",
            "contextmenu",
            "dblclick",
            "dragstart",
            "mousedown",
            "mouseup",
            "pointercancel",
            "pointerdown",
            "pointerup",
        ];

        function stopEvent(event: Event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }

        for (const eventName of eventNames) {
            blocker.addEventListener(eventName, stopEvent, true);
        }

        return () => {
            for (const eventName of eventNames) {
                blocker.removeEventListener(eventName, stopEvent, true);
            }
        };
    }, []);

    return (
        <div
            ref={blockerRef}
            className={q("dummy-quest-preview", disabled ? "dimmed-settings-item" : undefined)}
            style={style}
            onAuxClickCapture={stopDummyQuestInteraction}
            onClickCapture={stopDummyQuestInteraction}
            onContextMenuCapture={stopDummyQuestInteraction}
            onDoubleClickCapture={stopDummyQuestInteraction}
            onDragStartCapture={stopDummyQuestInteraction}
            onMouseDownCapture={stopDummyQuestInteraction}
            onMouseUpCapture={stopDummyQuestInteraction}
            onPointerCancelCapture={stopDummyQuestInteraction}
            onPointerDownCapture={stopDummyQuestInteraction}
            onPointerUpCapture={stopDummyQuestInteraction}
        >
            <QuestTile
                className={classes}
                quest={dummyQuest}
            />
        </div>
    );
}

function DummyQuestPreview({
    disabled,
    dummyColor,
    dummyGradient,
}: {
    disabled?: boolean;
    dummyColor: QuestTileColorSetting;
    dummyGradient: QuestTileGradient;
}): JSX.Element | null {
    const sourceQuest = useStateFromStores([QuestStore], getRandomQuest);

    const dummyQuest = useMemo(
        () => sourceQuest ? cloneDummyQuest(sourceQuest, dummyColor) : null,
        [dummyColor, sourceQuest]
    );

    if (!dummyQuest) return null;

    return (
        <DummyQuestTile
            disabled={disabled}
            dummyQuest={dummyQuest}
            dummyGradient={dummyGradient}
        />
    );
}

export function QuestTilesSetting(): JSX.Element {
    const questTiles = useQuestifySettings([
        "disableQuestsEverything",
        "questTileUnclaimedColor",
        "questTileClaimedColor",
        "questTileIgnoredColor",
        "questTileExpiredColor",
        "questTileGradient",
        "questTilePreload",
    ]);

    const [previewColorKey, setPreviewColorKey] = useState<QuestTileColorKey>(defaultPreviewColorKey);

    const disabled = questTiles.disableQuestsEverything;
    const previewColor = questTiles[previewColorKey] as QuestTileColorSetting;

    function updateColor(key: QuestTileColorKey, nextColor: QuestTileColorSetting): void {
        setPreviewColorKey(key);
        getQuestifySettings()[key] = nextColor;
    }

    function updateColorValue(key: QuestTileColorKey, setting: QuestTileColorSetting, value: number | null): void {
        if (typeof value !== "number") return;

        updateColor(key, {
            enabled: setting.enabled,
            color: value,
        });
    }

    function updateColorEnabled(key: QuestTileColorKey, setting: QuestTileColorSetting, enabled: boolean): void {
        updateColor(key, {
            ...setting,
            enabled,
        });
    }

    function updateGradient(value: string | string[] | null): void {
        if (typeof value !== "string") return;

        getQuestifySettings().questTileGradient = value as QuestTileGradient;
    }

    function updatePreload(value: string | string[] | null): void {
        if (typeof value !== "string") return;

        const preload = value === "true";
        getQuestifySettings().questTilePreload = preload;
        rerenderQuests();
    }

    return (
        <SettingsCard>
            <SettingsHeader> Quest Tiles </SettingsHeader>
            <SettingsDescription> Highlight Quests with optional theme colors for visibility. </SettingsDescription>
            <SettingsSubheader> Tile Behavior </SettingsSubheader>
            <SettingsRow className="quest-tile-behavior-row">
                <SettingsRowItem className="quest-tile-gradient-row-item">
                    <SettingsSelect
                        label="Gradient Style:"
                        options={gradientManaOptions}
                        value={questTiles.questTileGradient}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        maxOptionsVisible={gradientManaOptions.length}
                        onSelectionChange={updateGradient}
                        tooltip={{
                            position: "top",
                            text: "Intense and Default use the selected tile color in the asset gradient."
                                + "\n\nSubtle Black keeps a darker neutral gradient for contrast."
                                + "\n\nNo Gradient removes the asset gradient, which can make some Quest artwork harder to read."
                        }}
                    />
                </SettingsRowItem>
                <SettingsRowItem className="quest-tile-preload-row-item">
                    <SettingsSelect
                        label="Asset Preload:"
                        options={preloadManaOptions}
                        value={String(questTiles.questTilePreload)}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        maxOptionsVisible={preloadManaOptions.length}
                        onSelectionChange={updatePreload}
                        tooltip={{
                            position: "top",
                            text: "Loading all assets when the Quests page opens reduces layout shifting while scrolling."
                                + "\n\nLoading during page scroll is closer to Discord's default behavior and may use less work up front."
                        }}
                    />
                </SettingsRowItem>
            </SettingsRow>
            <SettingsSubheader> Tile Colors </SettingsSubheader>
            <SettingsRow className="quest-tile-color-row">
                {colorOptions.map(({ key, label }) => {
                    const setting = questTiles[key] as QuestTileColorSetting;

                    return (
                        <SettingsRowItem key={key} className="quest-tile-color-row-item">
                            <div
                                onFocusCapture={() => setPreviewColorKey(key)}
                                onPointerDownCapture={() => setPreviewColorKey(key)}
                            >
                                <SettingsColorPicker
                                    label={`${label}:`}
                                    className={["quest-tile-color-picker", setting.enabled ? "" : "disabled-color-picker"].filter(Boolean)}
                                    color={setting.color}
                                    disabled={disabled || !setting.enabled}
                                    onChange={value => updateColorValue(key, setting, value)}
                                    showEyeDropper={true}
                                />
                            </div>
                            <div className={q("settings-button", "quest-tile-color-button")}>
                                <ManaButton
                                    text={setting.enabled ? "Disable" : "Enable"}
                                    variant={setting.enabled ? "critical-secondary" : "primary"}
                                    disabled={disabled}
                                    fullWidth={true}
                                    size="sm"
                                    onClick={() => updateColorEnabled(key, setting, !setting.enabled)}
                                />
                            </div>
                        </SettingsRowItem>
                    );
                })}
            </SettingsRow>
            <DummyQuestPreview
                disabled={disabled}
                dummyColor={previewColor}
                dummyGradient={questTiles.questTileGradient as QuestTileGradient}
            />
        </SettingsCard>
    );
}
