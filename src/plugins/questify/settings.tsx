/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { ErrorBoundary } from "@components/index";
import { Logger } from "@utils/Logger";
import { OptionType } from "@utils/types";
import { Button, ContextMenuApi, Forms, Menu, Select, TextArea, TextInput, useEffect, useRef, useState } from "@webpack/common";
import { JSX } from "react";

import { getQuestTileClasses } from "./index";
import { ColorPicker, DisableQuestsSettingOption, DisableQuestsSettingProps, DynamicDropdown, FetchingQuestsSettingProps, GuildlessServerListItem, Quest, QuestButtonSettingProps, QuestIcon, QuestTile, RadioGroup, RadioOption, RestyleQuestsSettingProps, SelectOption, SoundIcon } from "./utils/components";
import { AudioPlayer, decimalToRGB, fetchAndDispatchQuests, getFormattedNow, isDarkish, isSoundAllowed, leftClick, middleClick, normalizeQuestName, q, QuestifyLogger, QuestsStore, rightClick, validCommaSeparatedList } from "./utils/misc";

let autoFetchInterval: null | ReturnType<typeof setInterval> = null;
const defaultLeftClickAction = "open-quests";
const defaultMiddleClickAction = "plugin-settings";
const defaultRightClickAction = "context-menu";
const defaultQuestButtonDisplay = "always";
const defaultQuestButtonUnclaimed = "both";
const defaultQuestORder = "UNCLAIMED, CLAIMED, IGNORED, EXPIRED";
const defaultUnclaimedColor = 2842239;
const defaultClaimedColor = 6105983;
const defaultIgnoredColor = 8334124;
const defaultExpiredColor = 2368553;
const defaultRestyleQuestsGradient = "intense";
const defaultFetchQuestsAlert = "discodo";
export const minimumAutoFetchIntervalValue = 30 * 60;
export const maximumAutoFetchIntervalValue = 12 * 60 * 60;

export function fetchAndAlertQuests(source: string, logger: Logger): void {
    const currentQuests = Array.from(QuestsStore.quests.values()) as Quest[];

    fetchAndDispatchQuests(source, logger).then(newQuests => {
        if (newQuests !== null && Array.isArray(newQuests) && currentQuests.length > 0) {
            const currentIds = new Set(currentQuests.map((q: Quest) => q.id));
            const newOnly = newQuests.filter((q: Quest) => !currentIds.has(q.id));

            if (newOnly.length > 0) {
                const shouldAlert = settings.store.fetchingQuestsAlert;

                if (shouldAlert) {
                    logger.info(`[${getFormattedNow()}] New quests detected. Playing alert sound.`);

                    setTimeout(() => {
                        AudioPlayer(shouldAlert, 1).play();
                    }, 1000); // Give the Quest Button a chance to update first.
                } else {
                    logger.info(`[${getFormattedNow()}] New quests detected.`);
                }
            }
        }
    });
}

export function startAutoFetchingQuests(seconds?: number): void {
    if (autoFetchInterval) {
        clearInterval(autoFetchInterval);
        autoFetchInterval = null;
    }

    const interval = seconds ? seconds * 1000 : settings.store.fetchingQuestsInterval * 1000;
    QuestifyLogger.info(`[${getFormattedNow()}] Starting AutoFetch of quests every ${(interval / 60000).toFixed(2)} minutes.`);
    autoFetchInterval = setInterval(() => { fetchAndAlertQuests("Questify-AutoFetch", QuestifyLogger); }, interval);
}

export function stopAutoFetchingQuests(): void {
    if (autoFetchInterval) {
        QuestifyLogger.info(`[${getFormattedNow()}] Stopping AutoFetch of quests.`);
        clearInterval(autoFetchInterval);
        autoFetchInterval = null;
    }
}

export function autoFetchCompatible(): boolean {
    const display = settings.store.questButtonDisplay;
    const unclaimed = settings.store.questButtonUnclaimed;
    const fetching = !settings.store.disableQuestsEverything && !settings.store.disableQuestsFetchingQuests;

    if (display === "always") {
        return fetching && ["pill", "badge", "both"].includes(unclaimed);
    } else if (display === "unclaimed") {
        return fetching;
    } else {
        return false;
    }
}

export const intervalScales = {
    second: {
        singular: "Second",
        plural: "Seconds",
        multiplier: 1
    },
    minute: {
        singular: "Minute",
        plural: "Minutes",
        multiplier: 60
    },
    hour: {
        singular: "Hour",
        plural: "Hours",
        multiplier: 60 * 60
    },
    day: {
        singular: "Day",
        plural: "Days",
        multiplier: 24 * 60 * 60
    },
    week: {
        singular: "Week",
        plural: "Weeks",
        multiplier: 7 * 24 * 60 * 60
    }
};

export function removeIgnoredQuest(questName: string): void {
    const ignoredQuests = settings.store.ignoredQuests.split("\n");
    validateIgnoredQuests(ignoredQuests.filter(name => normalizeQuestName(name) !== normalizeQuestName(questName)).join("\n"));
}

export function addIgnoredQuest(questName: string): void {
    const { ignoredQuests } = settings.store;
    validateIgnoredQuests(ignoredQuests + "\n" + normalizeQuestName(questName));
}

export function questIsIgnored(questName: string): boolean {
    const ignoredQuests = new Set(settings.store.ignoredQuests.split("\n").map(normalizeQuestName));
    return ignoredQuests.has(normalizeQuestName(questName));
}

export function validateIgnoredQuests(ignoredQuests?: string, questsData?: Quest[]): string {
    const quests = questsData ?? Array.from(QuestsStore.quests.values()) as Quest[];
    const currentlyIgnored = new Set((ignoredQuests ?? settings.store.ignoredQuests).split("\n").map(normalizeQuestName));
    const validIgnored = new Set<string>();
    let numUnclaimedUnignoredQuests = 0;

    for (const quest of quests) {
        const normalizedName = normalizeQuestName(quest.config.messages.questName);
        const claimedQuest = quest.userStatus?.claimedAt;
        const questExpired = new Date(quest.config.expiresAt) < new Date();

        if (!claimedQuest && !questExpired) {
            if (currentlyIgnored.has(normalizedName)) {
                validIgnored.add(normalizedName);
            } else {
                numUnclaimedUnignoredQuests++;
            }
        }
    }

    settings.store.unclaimedUnignoredQuests = numUnclaimedUnignoredQuests;
    const ignoredStr = Array.from(validIgnored).join("\n");
    settings.store.ignoredQuests = ignoredStr;

    return ignoredStr;
}

interface DummyQuestButtonProps {
    visible: boolean;
    selected: boolean;
    showPill: boolean;
    showBadge: boolean;
    badgeColor: number | null;
    leftClickAction: string;
    middleClickAction: string;
    rightClickAction: string;
    onSelectedChange: (selected: boolean) => void;
}

function DummyQuestButton({
    visible,
    selected,
    showPill,
    showBadge,
    badgeColor,
    leftClickAction,
    middleClickAction,
    rightClickAction,
    onSelectedChange
}: DummyQuestButtonProps): JSX.Element {
    function handleClick(event: React.MouseEvent<Element>) {
        // ListItem does not support onAuxClick, so we have to listen for mousedown events.
        // Ignore left and right clicks sent via mousedown events to prevent double events.
        if (event.type === "mousedown" && event.button !== middleClick) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        let todo: string | null = null;

        if (event.button === middleClick) {
            todo = middleClickAction;
        } else if (event.button === rightClick) {
            todo = rightClickAction;
        } else if (event.button === leftClick) {
            todo = leftClickAction;
        }

        if (todo === "open-quests") {
            onSelectedChange(!selected);
        } else if (todo === "plugin-settings") {
        } else if (todo === "context-menu") {
            ContextMenuApi.openContextMenu(event, () => (
                <Menu.Menu
                    navId={q("dummy-quest-button-context-menu")}
                    onClose={ContextMenuApi.closeContextMenu}
                    aria-label="Quest Button Menu"
                >
                    <Menu.MenuItem
                        id={q("dummy-quest-button-mark-all-ignored")}
                        label="Mark All Ignored"
                        disabled={true}
                    />
                    <Menu.MenuItem
                        id={q("dummy-quest-button-reset-ignored-list")}
                        label="Reset Ignored List"
                        disabled={true}
                    />
                    <Menu.MenuItem
                        id={q("dummy-quest-button-fetch-quests")}
                        label="Fetch Quests"
                        disabled={true}
                    />
                </Menu.Menu>
            ));
        }
    }

    const dummyBadgeColorRGB = badgeColor ? decimalToRGB(badgeColor) : null;
    const lowerBadgeProps = {
        count: showBadge ? 3 : 0,
        maxDigits: 2,
        ...(dummyBadgeColorRGB ? { color: `rgb(${dummyBadgeColorRGB.r},${dummyBadgeColorRGB.g},${dummyBadgeColorRGB.b})` } : {}),
        ...(dummyBadgeColorRGB ? { style: { color: isDarkish(dummyBadgeColorRGB) ? "white" : "black" } } : {})
    };

    return (
        <GuildlessServerListItem
            id={q("dummy-quest-button")}
            className={q("dummy-quest-button", "quest-button")}
            icon={QuestIcon(26, 26)}
            tooltip="Quests"
            showPill={true}
            isVisible={visible}
            isSelected={selected}
            hasUnread={showPill}
            lowerBadgeProps={lowerBadgeProps}
            onClick={handleClick}
            onContextMenu={handleClick}
            onMouseDown={handleClick}
        />
    );
}

function validateQuestButtonSetting() {
    const {
        questButtonDisplay,
        questButtonUnclaimed,
        questButtonBadgeColor,
        questButtonLeftClickAction,
        questButtonMiddleClickAction,
        questButtonRightClickAction
    } = settings.use([
        "questButtonDisplay",
        "questButtonUnclaimed",
        "questButtonBadgeColor",
        "questButtonLeftClickAction",
        "questButtonMiddleClickAction",
        "questButtonRightClickAction"
    ]);

    if (!["always", "unclaimed", "never"].includes(questButtonDisplay)) {
        settings.store.questButtonDisplay = "always";
    }

    if (!["pill", "badge", "both", "none"].includes(questButtonUnclaimed)) {
        settings.store.questButtonUnclaimed = "both";
    }

    if (typeof questButtonBadgeColor !== "number" && questButtonBadgeColor !== null) {
        settings.store.questButtonBadgeColor = defaultUnclaimedColor;
    }

    if (!["open-quests", "context-menu", "plugin-settings", "nothing"].includes(questButtonLeftClickAction)) {
        settings.store.questButtonLeftClickAction = defaultLeftClickAction;
    }

    if (!["open-quests", "context-menu", "plugin-settings", "nothing"].includes(questButtonMiddleClickAction)) {
        settings.store.questButtonMiddleClickAction = defaultMiddleClickAction;
    }

    if (!["open-quests", "context-menu", "plugin-settings", "nothing"].includes(questButtonRightClickAction)) {
        settings.store.questButtonRightClickAction = defaultRightClickAction;
    }
}

function validateDisableQuestSetting() {
    const {
        disableQuestsEverything,
        disableQuestsDiscoveryTab,
        disableQuestsFetchingQuests,
        disableQuestsPopupAboveAccountPanel,
        disableQuestsBadgeOnUserProfiles,
        disableQuestsGiftInventoryRelocationNotice,
        disableFriendsListActiveNowPromotion
    } = settings.use([
        "disableQuestsEverything",
        "disableQuestsDiscoveryTab",
        "disableQuestsFetchingQuests",
        "disableQuestsPopupAboveAccountPanel",
        "disableQuestsBadgeOnUserProfiles",
        "disableQuestsGiftInventoryRelocationNotice",
        "disableFriendsListActiveNowPromotion"
    ]);

    if (disableQuestsDiscoveryTab || disableQuestsFetchingQuests || disableQuestsPopupAboveAccountPanel || disableQuestsBadgeOnUserProfiles || disableQuestsGiftInventoryRelocationNotice || disableFriendsListActiveNowPromotion) {
        settings.store.disableQuestsEverything = false;
    }
}

function QuestButtonSettings(props: { setValue: (value: QuestButtonSettingProps) => void; }): JSX.Element {
    validateQuestButtonSetting();

    const {
        questButtonDisplay,
        questButtonUnclaimed,
        questButtonBadgeColor,
        questButtonLeftClickAction,
        questButtonMiddleClickAction,
        questButtonRightClickAction
    } = settings.use([
        "questButtonDisplay",
        "questButtonUnclaimed",
        "questButtonBadgeColor",
        "questButtonLeftClickAction",
        "questButtonMiddleClickAction",
        "questButtonRightClickAction"
    ]);

    const questButtonDisplayOptions: RadioOption[] = [
        { name: "Always", value: "always" },
        { name: "Unclaimed", value: "unclaimed" },
        { name: "Never", value: "never" }
    ];

    const questButtonUnclaimedOptions: RadioOption[] = [
        { name: "Pill", value: "pill" },
        { name: "Badge", value: "badge" },
        { name: "Both", value: "both" },
        { name: "None", value: "none" }
    ];

    const questButtonClickOptions: SelectOption[] = [
        { label: "Open Quests", value: "open-quests" },
        { label: "Context Menu", value: "context-menu" },
        { label: "Plugin Settings", value: "plugin-settings" },
        { label: "Nothing", value: "nothing" }
    ];

    const [currentQuestButtonDisplay, setCurrentQuestButtonDisplay] = useState((questButtonDisplayOptions.find(option => option.value === questButtonDisplay) as RadioOption));
    const [currentQuestButtonUnclaimed, setCurrentQuestButtonUnclaimed] = useState((questButtonUnclaimedOptions.find(option => option.value === questButtonUnclaimed) as RadioOption));
    const [currentQuestButtonLeftClickAction, setCurrentQuestButtonLeftClickAction] = useState<"open-quests" | "plugin-settings" | "context-menu" | "nothing">(questButtonLeftClickAction as "open-quests" | "plugin-settings" | "context-menu" | "nothing");
    const [currentQuestButtonMiddleClickAction, setCurrentQuestButtonMiddleClickAction] = useState<"open-quests" | "plugin-settings" | "context-menu" | "nothing">(questButtonMiddleClickAction as "open-quests" | "plugin-settings" | "context-menu" | "nothing");
    const [currentQuestButtonRightClickAction, setCurrentQuestButtonRightClickAction] = useState<"open-quests" | "plugin-settings" | "context-menu" | "nothing">(questButtonRightClickAction as "open-quests" | "plugin-settings" | "context-menu" | "nothing");
    const [currentBadgeColor, setCurrentBadgeColor] = useState((questButtonBadgeColor as number | null));
    const [dummySelected, setDummySelected] = useState(false);

    function handleQuestButtonDisplayChange(value: RadioOption) {
        setCurrentQuestButtonDisplay(value);

        props.setValue(
            {
                display: value.value,
                unclaimed: currentQuestButtonUnclaimed.value,
                leftClickAction: currentQuestButtonLeftClickAction,
                middleClickAction: currentQuestButtonMiddleClickAction,
                rightClickAction: currentQuestButtonRightClickAction,
                badgeColor: currentBadgeColor
            }
        );
    }

    function handleQuestButtonUnclaimedChange(value: RadioOption) {
        setCurrentQuestButtonUnclaimed(value);

        props.setValue(
            {
                display: currentQuestButtonDisplay.value,
                unclaimed: value.value,
                leftClickAction: currentQuestButtonLeftClickAction,
                middleClickAction: currentQuestButtonMiddleClickAction,
                rightClickAction: currentQuestButtonRightClickAction,
                badgeColor: currentBadgeColor
            }
        );
    }

    function handleBadgeColorChange(value: number | null) {
        setCurrentBadgeColor(value);

        props.setValue(
            {
                display: currentQuestButtonDisplay.value,
                unclaimed: currentQuestButtonUnclaimed.value,
                leftClickAction: currentQuestButtonLeftClickAction,
                middleClickAction: currentQuestButtonMiddleClickAction,
                rightClickAction: currentQuestButtonRightClickAction,
                badgeColor: value
            }
        );
    }

    function handleLeftClickActionChange(value: "open-quests" | "context-menu" | "plugin-settings" | "nothing") {
        setCurrentQuestButtonLeftClickAction(value);

        props.setValue(
            {
                display: currentQuestButtonDisplay.value,
                unclaimed: currentQuestButtonUnclaimed.value,
                leftClickAction: value,
                middleClickAction: currentQuestButtonMiddleClickAction,
                rightClickAction: currentQuestButtonRightClickAction,
                badgeColor: currentBadgeColor
            }
        );
    }
    function handleMiddleClickActionChange(value: "open-quests" | "context-menu" | "plugin-settings" | "nothing") {
        setCurrentQuestButtonMiddleClickAction(value);

        props.setValue(
            {
                display: currentQuestButtonDisplay.value,
                unclaimed: currentQuestButtonUnclaimed.value,
                leftClickAction: currentQuestButtonLeftClickAction,
                middleClickAction: value,
                rightClickAction: currentQuestButtonRightClickAction,
                badgeColor: currentBadgeColor
            }
        );
    }
    function handleRightClickActionChange(value: "open-quests" | "context-menu" | "plugin-settings" | "nothing") {
        setCurrentQuestButtonRightClickAction(value);

        props.setValue(
            {
                display: currentQuestButtonDisplay.value,
                unclaimed: currentQuestButtonUnclaimed.value,
                leftClickAction: currentQuestButtonLeftClickAction,
                middleClickAction: currentQuestButtonMiddleClickAction,
                rightClickAction: value,
                badgeColor: currentBadgeColor
            }
        );
    }

    return (
        <ErrorBoundary>
            <Forms.FormDivider className={q("setting-divider")} />
            <div className={q("setting", "quest-icon-setting")}>
                <Forms.FormSection>
                    <div className={q("main-inline-group")}>
                        <div>
                            <Forms.FormTitle className={q("form-title")}>
                                Quest Button
                            </Forms.FormTitle>
                            <Forms.FormText className={q("form-description")}>
                                Show a Quest button in the server list with an optional indicator for unclaimed Quests.
                            </Forms.FormText>
                        </div>
                        <div className={q("dummy-quest-button")}>
                            <DummyQuestButton
                                visible={currentQuestButtonDisplay.value !== "never"}
                                selected={dummySelected}
                                showPill={currentQuestButtonUnclaimed.value === "pill" || currentQuestButtonUnclaimed.value === "both"}
                                showBadge={currentQuestButtonUnclaimed.value === "badge" || currentQuestButtonUnclaimed.value === "both"}
                                badgeColor={currentBadgeColor}
                                leftClickAction={currentQuestButtonLeftClickAction}
                                middleClickAction={currentQuestButtonMiddleClickAction}
                                rightClickAction={currentQuestButtonRightClickAction}
                                onSelectedChange={setDummySelected}
                            />
                        </div>
                    </div>
                    <div className={q("main-inline-group")}>
                        <div className={q("inline-group-item")}>
                            <Forms.FormTitle className={q("form-subtitle")}>
                                Button Visibility
                            </Forms.FormTitle>
                            <RadioGroup
                                value={(currentQuestButtonDisplay as any).value}
                                options={questButtonDisplayOptions}
                                onChange={handleQuestButtonDisplayChange}
                            />
                            <Forms.FormTitle className={q("form-subtitle")}>
                                Badge Color
                            </Forms.FormTitle>
                            <div className={q("sub-inline-group")}>
                                <ColorPicker
                                    color={currentBadgeColor}
                                    onChange={handleBadgeColorChange}
                                    showEyeDropper={true}
                                />
                                <Button
                                    className={q("button", "button-blue")}
                                    onClick={() => handleBadgeColorChange(defaultUnclaimedColor)}
                                >
                                    Default
                                </Button>
                                <Button
                                    className={q("button", "button-red")}
                                    onClick={() => handleBadgeColorChange(null)}
                                >
                                    Disable
                                </Button>
                            </div>
                        </div>
                        <div className={q("inline-group-item")}>
                            <Forms.FormTitle className={q("form-subtitle")}>
                                Unclaimed Indicator
                            </Forms.FormTitle>
                            <RadioGroup
                                value={(currentQuestButtonUnclaimed as any).value}
                                options={questButtonUnclaimedOptions}
                                onChange={handleQuestButtonUnclaimedChange}
                            />
                        </div>
                    </div>
                    <div className={q("main-inline-group")}>
                        <div className={q("inline-group-item")}>
                            <Forms.FormTitle className={q("form-subtitle", "form-subtitle-spacier")}>
                                Left Click Action
                            </Forms.FormTitle>
                            <Select
                                options={questButtonClickOptions}
                                className={q("select")}
                                popoutPosition="top"
                                serialize={String}
                                isSelected={(value: string) => value === currentQuestButtonLeftClickAction}
                                select={handleLeftClickActionChange}
                            />
                        </div>
                        <div className={q("inline-group-item")}>
                            <Forms.FormTitle className={q("form-subtitle", "form-subtitle-spacier")}>
                                Middle Click Action
                            </Forms.FormTitle>
                            <Select
                                options={questButtonClickOptions}
                                className={q("select")}
                                popoutPosition="top"
                                serialize={String}
                                isSelected={(value: string) => value === currentQuestButtonMiddleClickAction}
                                select={handleMiddleClickActionChange}
                            />
                        </div>
                        <div className={q("inline-group-item")}>
                            <Forms.FormTitle className={q("form-subtitle", "form-subtitle-spacier")}>
                                Right Click Action
                            </Forms.FormTitle>
                            <Select
                                options={questButtonClickOptions}
                                className={q("select")}
                                popoutPosition="top"
                                serialize={String}
                                isSelected={(value: string) => value === currentQuestButtonRightClickAction}
                                select={handleRightClickActionChange}
                            />
                        </div>
                    </div>
                </Forms.FormSection>
            </div>
        </ErrorBoundary>
    );
}

function DisableQuestsSetting(props: { setValue: (value: DisableQuestsSettingProps) => void; }): JSX.Element {
    validateDisableQuestSetting();

    const {
        disableQuestsEverything,
        disableQuestsDiscoveryTab,
        disableQuestsFetchingQuests,
        disableQuestsPopupAboveAccountPanel,
        disableQuestsBadgeOnUserProfiles,
        disableQuestsGiftInventoryRelocationNotice,
        disableFriendsListActiveNowPromotion
    } = settings.use([
        "disableQuestsEverything",
        "disableQuestsDiscoveryTab",
        "disableQuestsFetchingQuests",
        "disableQuestsPopupAboveAccountPanel",
        "disableQuestsBadgeOnUserProfiles",
        "disableQuestsGiftInventoryRelocationNotice",
        "disableFriendsListActiveNowPromotion"
    ]);

    const options: DisableQuestsSettingOption[] = [
        { label: "Everything", value: "everything", selected: disableQuestsEverything, setting: "disableQuests" },
        { label: "Discovery Tab", value: "discovery", selected: disableQuestsDiscoveryTab, setting: "disableDiscoveryTab" },
        { label: "Fetching Quests", value: "fetching", selected: disableQuestsFetchingQuests, setting: "disableFetchingQuests" },
        { label: "Badge on User Profiles", value: "badge", selected: disableQuestsBadgeOnUserProfiles, setting: "disableBadgeOnUserProfiles" },
        { label: "Popup Above User Panel", value: "popup", selected: disableQuestsPopupAboveAccountPanel, setting: "disablePopupAboveAccountPanel" },
        { label: "Gift Inventory Relocation Notice", value: "inventory", selected: disableQuestsGiftInventoryRelocationNotice, setting: "disableGiftInventoryRelocationNotice" },
        { label: "Friends List Active Now Promotion", value: "friends-list", selected: disableFriendsListActiveNowPromotion, setting: "disableFriendsListActiveNowPromotion" }
    ];

    const everythingOnly = options.find(option => option.value === "everything") as DisableQuestsSettingOption;
    const [currentValue, setCurrentValue] = useState(options.filter(option => option.selected));

    function updateSettingsTruthy(enabled: DisableQuestsSettingOption[]) {
        const enabledValues = enabled.map(option => option.value);

        options.forEach(option => {
            option.selected = enabledValues.includes(option.value);
        });

        props.setValue({
            everything: enabledValues.includes("everything"),
            discoveryTab: enabledValues.includes("discovery"),
            fetchingQuests: enabledValues.includes("fetching"),
            popupAboveAccountPanel: enabledValues.includes("popup"),
            badgeOnUserProfiles: enabledValues.includes("badge"),
            giftInventoryRelocationNotice: enabledValues.includes("inventory"),
            friendsListActiveNowPromotion: enabledValues.includes("friends-list")
        });

        setCurrentValue(enabled);
    }

    function handleChange(values: Array<DisableQuestsSettingOption | string>) {
        if (values.length === 0) {
            updateSettingsTruthy([]);
            return;
        }

        if (values.some(v => typeof v === "string" && v === "everything")) {
            if (everythingOnly.selected) {
                updateSettingsTruthy([]);
            } else {
                updateSettingsTruthy([everythingOnly]);
            }

            return;
        }

        const stringlessValues = values.filter(v => typeof v !== "string") as DisableQuestsSettingOption[];
        const selectedOption = values.find(v => typeof v === "string") as string;

        if (stringlessValues.some(option => option.value === selectedOption)) {
            updateSettingsTruthy(stringlessValues.filter(option => option.value !== selectedOption && option.value !== everythingOnly.value));
        } else {
            const newSelectedOptions = [...stringlessValues.filter(option => option.value !== everythingOnly.value), options.find(option => option.value === selectedOption) as DisableQuestsSettingOption];
            updateSettingsTruthy(newSelectedOptions);
        }
    }

    return (
        <ErrorBoundary>
            <Forms.FormDivider className={q("setting-divider")} />
            <div className={q("setting", "disable-quests-setting")}>
                <Forms.FormSection>
                    <Forms.FormTitle className={q("form-title")}>
                        Quest Features
                    </Forms.FormTitle>
                    <Forms.FormText className={q("form-description")}>
                        Disable specific Quest features, such as the popup for new Quests.
                    </Forms.FormText>
                    <DynamicDropdown
                        placeholder="Select which quest features to disable."
                        feedback="There's no supported Quest feature by that name."
                        className={q("select")}
                        maxVisibleItems={options.length}
                        clearable={true}
                        multi={true}
                        value={currentValue as any}
                        options={options}
                        onChange={handleChange}
                        closeOnSelect={false}
                    >
                    </DynamicDropdown>
                </Forms.FormSection>
            </div>
        </ErrorBoundary>
    );
}

function IgnoredQuestsSetting(props: { setValue: (value: string) => void; }): JSX.Element {
    const [value, setValue] = useState(settings.store.ignoredQuests);

    return (
        <ErrorBoundary>
            <Forms.FormDivider className={q("setting-divider")} />
            <div className={q("setting", "ignored-quests-setting")}>
                <Forms.FormSection>
                    <div>
                        <Forms.FormTitle className={q("form-title")}>
                            Ignored Quests
                        </Forms.FormTitle>
                        <Forms.FormText className={q("form-description")}>
                            A list of Quest names to exclude from the <span className="questify-inline-code-block">Unclaimed Indicator</span>.
                            <br /><br />
                            One Quest name per line. Names must match the spelling displayed on the Quests page.
                            Alternatively, click the three dots on a Quest tile and select the <span className="questify-inline-code-block">Mark as Ignored</span> option.
                        </Forms.FormText>
                    </div>
                    <div>
                        <TextArea
                            className={q("text-area")}
                            value={value}
                            onChange={newValue => {
                                setValue(newValue);
                                props.setValue(newValue);
                            }}
                        />
                    </div>
                </Forms.FormSection>
            </div>
            <Forms.FormDivider className={q("setting-divider")} />
        </ErrorBoundary>
    );
}

const DummyQuestPreview = ({ quest, dummyColor, dummyGradient }: { quest: Quest; dummyColor: number | null; dummyGradient: string; }) => {
    const classes = getQuestTileClasses("", quest, dummyColor, dummyGradient);

    return (
        <QuestTile
            className={[q("dummy-quest"), classes].join(" ")}
            quest={quest}
        />
    );
};

function RestyleQuestsSetting(props: { setValue: (value: RestyleQuestsSettingProps) => void; }) {
    const {
        restyleQuestsUnclaimed,
        restyleQuestsClaimed,
        restyleQuestsIgnored,
        restyleQuestsExpired,
        restyleQuestsGradient,
        restyleQuestsPreload
    } = settings.use([
        "restyleQuestsUnclaimed",
        "restyleQuestsClaimed",
        "restyleQuestsIgnored",
        "restyleQuestsExpired",
        "restyleQuestsGradient",
        "restyleQuestsPreload"
    ]);

    const [unclaimedColor, setUnclaimedColor] = useState<number | null>(restyleQuestsUnclaimed);
    const [claimedColor, setClaimedColor] = useState<number | null>(restyleQuestsClaimed);
    const [ignoredColor, setIgnoredColor] = useState<number | null>(restyleQuestsIgnored);
    const [expiredColor, setExpiredColor] = useState<number | null>(restyleQuestsExpired);
    const [restyleQuestsGradientValue, setRestyleQuestsGradientValue] = useState(restyleQuestsGradient);
    const [restyleQuestsPreloadValue, setRestyleQuestsPreloadValue] = useState(restyleQuestsPreload);
    const [dummyColor, setDummyColor] = useState<number | null>(restyleQuestsUnclaimed);
    const [dummyGradient, setDummyGradient] = useState(restyleQuestsGradient);

    const [hasQuests, setHasQuests] = useState(false);
    const [dummyQuest, setDummyQuest] = useState<Quest | null>(null);

    useEffect(() => {
        const handleChange = () => {
            if (QuestsStore.quests.size > 0) {
                if (!dummyQuest) {
                    const questArray = Array.from(QuestsStore.quests.values()) as Quest[];
                    const questIndex = Math.floor(Math.random() * questArray.length);
                    const questData = structuredClone(questArray[questIndex]);
                    questData.dummyColor = dummyColor as any;
                    setDummyQuest(questData);
                } else if (dummyQuest) {
                    const updatedQuest = structuredClone(dummyQuest);
                    updatedQuest.dummyColor = dummyColor as any;
                    setDummyQuest(updatedQuest);
                }

                setHasQuests(true);
            } else {
                setHasQuests(false);
                setDummyQuest(null);
            }
        };

        QuestsStore.addChangeListener(handleChange);
        handleChange();

        return () => QuestsStore.removeChangeListener(handleChange);
    }, [dummyColor]);

    function handleRestyleChange(colorIndex: number, newColorValue: number | null) {
        if (colorIndex === 0) setUnclaimedColor(newColorValue);
        if (colorIndex === 1) setClaimedColor(newColorValue);
        if (colorIndex === 2) setIgnoredColor(newColorValue);
        if (colorIndex === 3) setExpiredColor(newColorValue);
        setDummyColor(newColorValue);

        props.setValue({
            unclaimedColor: colorIndex === 0 ? newColorValue : unclaimedColor,
            claimedColor: colorIndex === 1 ? newColorValue : claimedColor,
            ignoredColor: colorIndex === 2 ? newColorValue : ignoredColor,
            expiredColor: colorIndex === 3 ? newColorValue : expiredColor,
            gradient: restyleQuestsGradientValue as "intense" | "default" | "black" | "hide",
            preload: restyleQuestsPreloadValue
        });
    }

    function handleGradientChange(value: "intense" | "default" | "black" | "hide") {
        setRestyleQuestsGradientValue(value);
        setDummyGradient(value);

        props.setValue({
            unclaimedColor,
            claimedColor,
            ignoredColor,
            expiredColor,
            gradient: value,
            preload: restyleQuestsPreloadValue
        });
    }

    function handlePreloadChange(value: boolean) {
        setRestyleQuestsPreloadValue(value);

        props.setValue({
            unclaimedColor,
            claimedColor,
            ignoredColor,
            expiredColor,
            gradient: restyleQuestsGradientValue as "intense" | "default" | "black" | "hide",
            preload: value
        });
    }

    const colorPickers = [
        {
            label: "Unclaimed",
            idx: 0,
            defaultValue: defaultUnclaimedColor,
            value: unclaimedColor
        },
        {
            label: "Claimed",
            idx: 1,
            defaultValue: defaultClaimedColor,
            value: claimedColor
        },
        {
            label: "Ignored",
            idx: 2,
            defaultValue: defaultIgnoredColor,
            value: ignoredColor
        },
        {
            label: "Expired",
            idx: 3,
            defaultValue: defaultExpiredColor,
            value: expiredColor
        }
    ];

    const gradientOptions = [
        { label: "Intense Restyle Gradient", value: "intense" },
        { label: "Default Restyle Gradient", value: "default" },
        { label: "Subtle Black Gradient", value: "black" },
        { label: "No Gradient", value: "hide" }
    ];

    const preloadOptions = [
        { label: "Load All Quest Assets On Page Load", value: true },
        { label: "Load Quest Assets During Page Scroll", value: false }
    ];

    return (
        <ErrorBoundary>
            <Forms.FormDivider className={q("setting-divider")} />
            <div className={q("setting", "restyle-quests-setting")}>
                <Forms.FormSection>
                    <div>
                        <Forms.FormTitle className={q("form-title")}>
                            Restyle Quests
                        </Forms.FormTitle>
                        <Forms.FormText className={q("form-description")}>
                            Highlight Quests with optional theme colors for visibility.
                        </Forms.FormText>
                    </div>
                    <div className={q("color-picker-container")}>
                        {colorPickers.map(({ label, idx, defaultValue, value }) => (
                            <div
                                key={label}
                                className={q("inline-group-item", "color-picker-group")}
                            >
                                <Forms.FormTitle className={q("form-subtitle")}>
                                    {label}
                                </Forms.FormTitle>
                                <div className={q("color-picker-with-buttons")}>
                                    <ColorPicker
                                        color={value}
                                        onChange={newValue => handleRestyleChange(idx, newValue)}
                                        showEyeDropper={true}
                                    />
                                    <div className={q("sub-inline-group")}>
                                        <Button
                                            className={q("button", "wide-button", "button-blue")}
                                            onClick={() => handleRestyleChange(idx, defaultValue)}
                                        >
                                            Default
                                        </Button>
                                        <Button
                                            className={q("button", "wide-button", "button-red")}
                                            onClick={() => handleRestyleChange(idx, null)}
                                        >
                                            Disable
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={q("main-inline-group")}>
                        <div className={q("gradient-setting-group", "inline-group-item", "flex-35")}>
                            <Forms.FormTitle className={q("form-subtitle")}>
                                Gradient Style
                            </Forms.FormTitle>
                            <Select
                                options={gradientOptions}
                                className={q("select")}
                                popoutPosition="top"
                                serialize={String}
                                isSelected={(value: string) => value === restyleQuestsGradientValue}
                                select={handleGradientChange}
                            />
                        </div>
                        <div className={q("preload-setting-group", "inline-group-item", "flex-65")}>
                            <Forms.FormTitle className={q("form-subtitle")}>
                                Asset Preload
                            </Forms.FormTitle>
                            <Select
                                options={preloadOptions}
                                className={q("select")}
                                popoutPosition="top"
                                serialize={String}
                                isSelected={(value: boolean) => value === restyleQuestsPreloadValue}
                                select={handlePreloadChange}
                            />
                        </div>
                    </div>
                    <div className={q("dummy-quest-preview")}>
                        {hasQuests && dummyQuest && (
                            <DummyQuestPreview quest={dummyQuest} dummyColor={dummyColor} dummyGradient={dummyGradient} />
                        )}
                    </div>
                </Forms.FormSection>
            </div>
        </ErrorBoundary>
    );
}

function ReorderQuestsSetting(props: { setValue: (value: string) => void; }): JSX.Element {
    const [value, setValue] = useState(settings.store.reorderQuests);

    return (
        <ErrorBoundary>
            <Forms.FormDivider className={q("setting-divider")} />
            <div className={q("setting", "reorder-quests-setting")}>
                <Forms.FormSection>
                    <div>
                        <Forms.FormTitle className={q("form-title")}>
                            Reorder Quests
                        </Forms.FormTitle>
                        <Forms.FormText className={q("form-description")}>
                            Sort Quests by their status. Leave empty for default sorting.
                            <br /><br />
                            Comma-separated list must contain all of: <span className="questify-inline-code-block">UNCLAIMED, CLAIMED, IGNORED, EXPIRED</span>.
                        </Forms.FormText>
                    </div>
                    <div>
                        <TextInput
                            inputClassName={q("text-input")}
                            value={value}
                            onChange={newValue => {
                                const trimmedValue = newValue.toUpperCase();
                                const isValid = validCommaSeparatedList(trimmedValue, ["UNCLAIMED", "CLAIMED", "IGNORED", "EXPIRED"], true, true, true, false);
                                setValue(trimmedValue);

                                if (isValid) {
                                    const cleaned = trimmedValue
                                        .split(",")
                                        .map(item => item.trim())
                                        .join(", ");
                                    props.setValue(cleaned);
                                }
                            }}
                            placeholder="Using Discord's default sorting."
                            error={
                                validCommaSeparatedList(value, ["UNCLAIMED", "CLAIMED", "IGNORED", "EXPIRED"], true, true, true, false)
                                    ? undefined
                                    : "Invalid format."
                            }
                        >
                        </TextInput>
                    </div>
                </Forms.FormSection>
            </div>
        </ErrorBoundary>
    );
}

function FetchingQuestsSetting(props: { setValue: (value: FetchingQuestsSettingProps) => void; }): JSX.Element {
    const {
        fetchingQuestsInterval,
        fetchingQuestsAlert
    } = settings.use([
        "fetchingQuestsInterval",
        "fetchingQuestsAlert"
    ]);

    const allowedScales: Record<string, { singular: string; plural: string; multiplier: number; }> = {
        minutes: { singular: "Minute", plural: "Minutes", multiplier: 60 },
        hours: { singular: "Hour", plural: "Hours", multiplier: 60 * 60 },
    };

    const resolvedIntervals: SelectOption[] = [
        { value: 0, label: "Disabled" },
        { value: 60 * 30, label: "30 Minutes" },
        { value: 60 * 60, label: "1 Hour" },
        { value: 60 * 60 * 2, label: "3 Hours" },
        { value: 60 * 60 * 4, label: "6 Hours" },
        { value: 60 * 60 * 6, label: "12 Hours" },
    ];

    const resolvedSounds: SelectOption[] = [
        { value: "activity_end", label: "Activity End" },
        { value: "activity_launch", label: "Activity Launch" },
        { value: "activity_user_join", label: "Activity User Join" },
        { value: "activity_user_left", label: "Activity User Left" },
        { value: "asmr_message1", label: "ASMR Message 1" },
        { value: "bit_message1", label: "Bit Message 1" },
        { value: "bop_message1", label: "Bop Message 1" },
        { value: "call_calling", label: "Call Calling" },
        { value: "call_ringing", label: "Call Ringing" },
        { value: "call_ringing_beat", label: "Call Ringing Beat" },
        { value: "call_ringing_snow_halation", label: "Call Ringing Snow Halation" },
        { value: "call_ringing_snowsgiving", label: "Call Ringing Snowsgiving" },
        { value: "clip_error", label: "Clip Error" },
        { value: "clip_save", label: "Clip Save" },
        { value: "ddr-down", label: "DDR Down" },
        { value: "ddr-left", label: "DDR Left" },
        { value: "ddr-right", label: "DDR Right" },
        { value: "ddr-up", label: "DDR Up" },
        { value: "deafen", label: "Deafen" },
        { value: "discodo", label: "Discodo" },
        { value: "disconnect", label: "Disconnect" },
        { value: "ducky_message1", label: "Ducky Message 1" },
        { value: "halloween_call_calling", label: "Halloween Call Calling" },
        { value: "halloween_call_ringing", label: "Halloween Call Ringing" },
        { value: "halloween_deafen", label: "Halloween Deafen" },
        { value: "halloween_defean", label: "Halloween Defean" },
        { value: "halloween_disconnect", label: "Halloween Disconnect" },
        { value: "halloween_message1", label: "Halloween Message 1" },
        { value: "halloween_mute", label: "Halloween Mute" },
        { value: "halloween_undeafen", label: "Halloween Undeafen" },
        { value: "halloween_undefean", label: "Halloween Undefean" },
        { value: "halloween_unmute", label: "Halloween Unmute" },
        { value: "halloween_user_join", label: "Halloween User Join" },
        { value: "halloween_user_leave", label: "Halloween User Leave" },
        { value: "highfive_clap", label: "Highfive Clap" },
        { value: "highfive_whistle", label: "Highfive Whistle" },
        { value: "human_man", label: "Human Man" },
        { value: "lofi_message1", label: "Lofi Message 1" },
        { value: "mention1", label: "Mention 1" },
        { value: "mention2", label: "Mention 2" },
        { value: "mention3", label: "Mention 3" },
        { value: "message1", label: "Message 1" },
        { value: "message2", label: "Message 2" },
        { value: "message3", label: "Message 3" },
        { value: "mute", label: "Mute" },
        { value: "overlayunlock", label: "Overlay Unlock" },
        { value: "poggermode_achievement_unlock", label: "Poggermode Achievement Unlock" },
        { value: "poggermode_applause", label: "Poggermode Applause" },
        { value: "poggermode_enabled", label: "Poggermode Enabled" },
        { value: "poggermode_message_send", label: "Poggermode Message Send" },
        { value: "ptt_start", label: "PTT Start" },
        { value: "ptt_stop", label: "PTT Stop" },
        { value: "reconnect", label: "Reconnect" },
        { value: "robot_man", label: "Robot Man" },
        { value: "stage_waiting", label: "Stage Waiting" },
        { value: "stream_ended", label: "Stream Ended" },
        { value: "stream_started", label: "Stream Started" },
        { value: "stream_user_joined", label: "Stream User Joined" },
        { value: "stream_user_left", label: "Stream User Left" },
        { value: "success", label: "Success" },
        { value: "undeafen", label: "Undeafen" },
        { value: "unmute", label: "Unmute" },
        { value: "user_join", label: "User Join" },
        { value: "user_leave", label: "User Leave" },
        { value: "user_moved", label: "User Moved" },
        { value: "vibing_wumpus", label: "Vibing Wumpus" },
        { value: "voice_filter_loopback_off", label: "Voice Filter Loopback Off" },
        { value: "voice_filter_loopback_on", label: "Voice Filter Loopback On" },
        { value: "voice_filter_off", label: "Voice Filter Off" },
        { value: "voice_filter_on", label: "Voice Filter On" },
        { value: "voice_filter_swap", label: "Voice Filter Swap" },
        { value: "winter_call_calling", label: "Winter Call Calling" },
        { value: "winter_call_ringing", label: "Winter Call Ringing" },
        { value: "winter_deafen", label: "Winter Deafen" },
        { value: "winter_disconnect", label: "Winter Disconnect" },
        { value: "winter_mute", label: "Winter Mute" },
        { value: "winter_undeafen", label: "Winter Undeafen" },
        { value: "winter_unmute", label: "Winter Unmute" },
        { value: "winter_user_join", label: "Winter User Join" },
        { value: "winter_user_leave", label: "Winter User Leave" },
    ];

    function createIntervalSelectOptionFromValue(value: number): SelectOption {
        const existingOption = resolvedIntervals.find(option => option.value === value);
        if (existingOption) { return existingOption; }

        const relevantScales = Object.entries(allowedScales).filter(([_, scale]) => { return value >= scale.multiplier; });
        const largestScale = relevantScales[relevantScales.length - 1]?.[1];
        const valueInScale = Math.ceil((value / largestScale.multiplier) * 100) / 100;
        const label = valueInScale === 1 ? largestScale.singular : largestScale.plural;

        return {
            value: value,
            label: `${valueInScale} ${label}`
        };
    }

    function createAlertSelectOptionFromValue(value: string): SelectOption | null {
        if (value === null) {
            return null;
        }

        const existingOption = resolvedSounds.find(option => option.value === value);

        if (existingOption) {
            return existingOption;
        }

        const filename = value
            .split("/")
            .pop()
            ?.split("?")[0]
            ?.split(".")[0]
            ?.replace(/_/g, " ")
            .replace(/\w\S*/g, word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ) || "Custom Sound";

        return {
            value: value,
            label: filename
        };
    }

    function getAllIntervalOptions(currentValue: SelectOption) {
        const otherOptions = resolvedIntervals.filter(option => option.value !== currentValue.value);

        return [
            currentValue,
            ...otherOptions
        ].sort((a, b) => Number(a.value) - Number(b.value));
    }

    function getAllAlertOptions(currentValue: SelectOption | null) {
        const otherOptions = currentValue ? resolvedSounds.filter(option => option.value !== currentValue.value) : resolvedSounds;

        if (!currentValue) {
            return otherOptions.sort((a, b) => a.label.localeCompare(b.label));
        }

        return [
            currentValue,
            ...otherOptions
        ].sort((a, b) => a.label.localeCompare(b.label));
    }

    function handleScaleSearchChange(searchValue: string) {
        if (!searchValue.trim()) {
            // Show all options for empty searches.
            setCurrentIntervalOptions(getAllIntervalOptions(currentIntervalSelection));
            return;
        }

        const isDisabledTerm = resolvedIntervals.find(option => option.value === 0 && option.label.toLowerCase().startsWith(searchValue.toLowerCase()));

        if (isDisabledTerm) {
            // Show the dedicated "disabled" option if it matches the search term.
            setCurrentIntervalOptions([isDisabledTerm]);
            return;
        }

        const match = searchValue.match(/^\s*(\d+\.?(?:\d+)?)\s*([a-zA-Z]+)?\s*$/i);

        if (!match) {
            // If the input can't be parsed, show feedback message.
            setCurrentIntervalOptions([]);
            return;
        }

        const num = Number(match[1]);
        const scaleName = match[2]?.toLowerCase();
        const resolvedScale = Object.keys(allowedScales).filter(key => allowedScales[key].singular.toLowerCase().startsWith(scaleName) || allowedScales[key].plural.toLowerCase().startsWith(scaleName))[0];

        if (isNaN(num)) {
            // If the input isn't valid, show feedback message.
            setCurrentIntervalOptions([]);
            return;
        }

        const options: SelectOption[] = [];

        if (!!resolvedScale === false) {
            for (const scale of Object.values(intervalScales)) {
                // Try each allowed scale to see if the value fits within the min/max range.
                const valueInScale = Math.ceil((num * scale.multiplier) * 100) / 100;

                if (valueInScale >= minimumAutoFetchIntervalValue && valueInScale <= maximumAutoFetchIntervalValue) {
                    options.push(createIntervalSelectOptionFromValue(valueInScale));
                }
            }
        } else {
            // If a specific scale was provided, use it to create the option.
            const scale = allowedScales[resolvedScale];
            const valueInScale = Math.ceil((num * scale.multiplier) * 100) / 100;

            if (valueInScale >= minimumAutoFetchIntervalValue && valueInScale <= maximumAutoFetchIntervalValue) {
                options.push(createIntervalSelectOptionFromValue(valueInScale));
            }
        }

        setCurrentIntervalOptions(options);
    }

    function handleAlertSearchChange(searchValue: string) {
        if (!searchValue.trim()) {
            // Show all options for empty searches.
            setCurrentAlertOptions(getAllAlertOptions(currentAlertSelection));
            return;
        }

        const isCustomSound = searchValue.startsWith("http://") || searchValue.startsWith("https://");
        const customSoundOption = createAlertSelectOptionFromValue(searchValue);

        if (isCustomSound) {
            isSoundAllowed(searchValue).then(allowed => {
                if (allowed) {
                    // If the input is a custom sound URL, show it as the only option.
                    setCurrentAlertOptions([customSoundOption as SelectOption]);
                } else {
                    // If the input is a custom sound URL but not allowed, show feedback message.
                    setCurrentAlertOptions([]);
                }
            });

            return;
        }

        const matches = resolvedSounds.filter(option => option.label.toLowerCase().replace(/\s+/, "").includes(searchValue.toLowerCase().replace(/\s+/, "")));

        if (matches) {
            // If a matching sound is found, show it as the only option.
            setCurrentAlertOptions(matches);
            return;
        }

        // If no match is found, show feedback message.
        setCurrentAlertOptions([]);
    }

    const resolvedIntervalValue = fetchingQuestsInterval;
    const [currentIntervalSelection, setCurrentSelection] = useState(createIntervalSelectOptionFromValue(resolvedIntervalValue));
    const [currentIntervalOptions, setCurrentIntervalOptions] = useState(getAllIntervalOptions(currentIntervalSelection));
    const resolvedAlertValue = fetchingQuestsAlert;
    const [currentAlertSelection, setCurrentAlertSelection] = useState<SelectOption | null>(createAlertSelectOptionFromValue(resolvedAlertValue));
    const [currentAlertOptions, setCurrentAlertOptions] = useState(getAllAlertOptions(currentAlertSelection));
    // Needed to update the playing state of the preview button.
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    // Needed to stop audio output on settings close mid-preview.
    const activePlayer = useRef<any>(null);

    function clearActivePlayer() {
        activePlayer.current?.stop();
        activePlayer.current = null;
        setIsPlaying(false);
    }

    useEffect(() => {
        return () => {
            clearActivePlayer();
        };
    }, []);

    return (
        <ErrorBoundary>
            <Forms.FormDivider className={q("setting-divider")} />
            <div className={q("setting", "fetching-quests-setting")}>
                <Forms.FormSection>
                    <div>
                        <Forms.FormTitle className={q("form-title")}>
                            Fetching Quests
                        </Forms.FormTitle>
                        <Forms.FormText className={q("form-description")}>
                            Configure how often to fetch Quests from Discord and set up alerts for new Quests.
                            <br /><br />
                            By default, Discord only fetches quests on load and when visiting the Quests page.
                            This means that without a fetch interval defined below, this plugin will become unaware
                            of new Quests added throughout the day.
                            <br /><br />
                            This relies on the Quest Button being enabled and set to either <span className="questify-inline-code-block">Unclaimed</span>, or set to <span className="questify-inline-code-block">Always</span> with
                            unclaimed <span className="questify-inline-code-block">Pill</span>, <span className="questify-inline-code-block">Badge</span>, or <span className="questify-inline-code-block">Both</span> indicators enabled. Otherwise, there is no reason to periodically fetch Quests.
                            <br /><br />
                            Also, if <span className="questify-inline-code-block">Fetching Quests</span> is blocked in the <span className="questify-inline-code-block">Quest Features</span> setting, this will not work.
                        </Forms.FormText>
                    </div>
                    <div>
                        <div>
                            <Forms.FormTitle className={q("form-subtitle", "form-subtitle-spacier")}>
                                Fetch Interval
                            </Forms.FormTitle>
                        </div>
                        <div>
                            <DynamicDropdown
                                placeholder="Select or type an interval between 30 minutes and 12 hours."
                                feedback="Intervals must be between 30 minutes and 12 hours."
                                className={q("select")}
                                maxVisibleItems={resolvedIntervals.length + 1}
                                clearable={false}
                                multi={false}
                                value={currentIntervalSelection as any}
                                options={currentIntervalOptions}
                                closeOnSelect={true}
                                onSearchChange={handleScaleSearchChange}
                                onChange={value => {
                                    const option = currentIntervalOptions.find(o => o.value === value) as SelectOption;

                                    props.setValue({
                                        interval: option.value as number,
                                        alert: fetchingQuestsAlert
                                    });

                                    setCurrentSelection(option);
                                    setCurrentIntervalOptions(getAllIntervalOptions(option));
                                }}
                            />
                        </div>
                    </div>
                    <div>
                        <div>
                            <Forms.FormTitle className={q("form-subtitle", "form-subtitle-spacier")}>
                                Alert Sound
                            </Forms.FormTitle>
                        </div>
                        <div className={q("sub-inline-group")}>
                            <div className={q("inline-group-item")}>
                                <DynamicDropdown
                                    filter={(options, query) => options}
                                    placeholder="Select a sound or provide a custom sound URL."
                                    feedback="Sound not found, or URL is not from a supported domain."
                                    className={q("select")}
                                    clearable={true}
                                    multi={false}
                                    maxVisibleItems={7}
                                    value={currentAlertSelection as any}
                                    options={currentAlertOptions}
                                    closeOnSelect={false}
                                    onSearchChange={handleAlertSearchChange}
                                    onChange={value => {
                                        const option = currentAlertOptions.find(o => o.value === value) as SelectOption;

                                        props.setValue({
                                            interval: fetchingQuestsInterval,
                                            alert: value ? option.value as string : null
                                        });

                                        setCurrentAlertSelection(value ? option : null);
                                        setCurrentAlertOptions(getAllAlertOptions(option));
                                    }}
                                />
                            </div>
                            <div
                                className={q("inline-group-item", "alert-icon", { "playing-audio": !!isPlaying })}
                                onClick={() => {
                                    if (currentAlertSelection?.value) {
                                        if (activePlayer.current) {
                                            clearActivePlayer();
                                        } else {
                                            activePlayer.current = AudioPlayer(currentAlertSelection.value as string, 1, clearActivePlayer);
                                            activePlayer.current?.play();
                                            setIsPlaying(true);
                                        }
                                    }
                                }}
                                style={{ cursor: currentAlertSelection && currentAlertSelection.value ? "pointer" : "default" }}
                            >
                                {SoundIcon(24, 24)}
                            </div>
                        </div>
                    </div>
                </Forms.FormSection>
            </div>
        </ErrorBoundary>
    );
}

export const settings = definePluginSettings({
    disableQuests: {
        type: OptionType.COMPONENT,
        component: (props: { setValue: (value: DisableQuestsSettingProps) => void; }) => DisableQuestsSetting(props),
        description: "Select which Quest features to disable.",
        onChange: (newValues: DisableQuestsSettingProps) => {
            settings.store.disableQuestsEverything = newValues.everything;
            settings.store.disableQuestsFetchingQuests = newValues.fetchingQuests;
            settings.store.disableQuestsDiscoveryTab = newValues.discoveryTab;
            settings.store.disableQuestsPopupAboveAccountPanel = newValues.popupAboveAccountPanel;
            settings.store.disableQuestsBadgeOnUserProfiles = newValues.badgeOnUserProfiles;
            settings.store.disableQuestsGiftInventoryRelocationNotice = newValues.giftInventoryRelocationNotice;
            settings.store.disableFriendsListActiveNowPromotion = newValues.friendsListActiveNowPromotion;
            const interval = settings.store.fetchingQuestsInterval;

            if (!!interval && autoFetchCompatible()) {
                startAutoFetchingQuests();
            } else {
                stopAutoFetchingQuests();
            }
        }
    },
    disableQuestsEverything: {
        type: OptionType.BOOLEAN,
        description: "Disable all Quest features.",
        default: false,
        hidden: true
    },
    disableQuestsFetchingQuests: {
        type: OptionType.BOOLEAN,
        description: "Disable fetching Quests from Discord.",
        default: false,
        hidden: true
    },
    disableQuestsDiscoveryTab: {
        type: OptionType.BOOLEAN,
        description: "Disable Quest tab in the Discovery page.",
        default: false,
        hidden: true
    },
    disableQuestsPopupAboveAccountPanel: {
        type: OptionType.BOOLEAN,
        description: "Disable the Quest popup above your account panel.",
        default: true,
        hidden: true
    },
    disableQuestsBadgeOnUserProfiles: {
        type: OptionType.BOOLEAN,
        description: "Disable the Quest badge on user profiles.",
        default: false,
        hidden: true
    },
    disableQuestsGiftInventoryRelocationNotice: {
        type: OptionType.BOOLEAN,
        description: "Disable the gift inventory Quest relocation notice.",
        default: true,
        hidden: true
    },
    disableFriendsListActiveNowPromotion: {
        type: OptionType.BOOLEAN,
        description: "Disable the promotion of Quests for games played by friends.",
        default: true,
        hidden: true
    },
    questButton: {
        type: OptionType.COMPONENT,
        component: (props: { setValue: (value: QuestButtonSettingProps) => void; }) => QuestButtonSettings(props),
        description: "Show a Quest button in the server list.",
        onChange: (newValue: QuestButtonSettingProps) => {
            settings.store.questButtonDisplay = newValue.display;
            settings.store.questButtonUnclaimed = newValue.unclaimed;
            settings.store.questButtonBadgeColor = newValue.badgeColor as any;
            settings.store.questButtonLeftClickAction = newValue.leftClickAction;
            settings.store.questButtonMiddleClickAction = newValue.middleClickAction;
            settings.store.questButtonRightClickAction = newValue.rightClickAction;
            const interval = settings.store.fetchingQuestsInterval;

            if (!!interval && autoFetchCompatible()) {
                startAutoFetchingQuests();
            } else {
                stopAutoFetchingQuests();
            }
        }
    },
    questButtonDisplay: {
        type: OptionType.STRING,
        description: "Which display type to use for the Quest button in the server list.",
        default: defaultQuestButtonDisplay, // "always", "unclaimed", "never"
        hidden: true,
    },
    questButtonUnclaimed: {
        type: OptionType.STRING,
        description: "Which display type to use for the unclaimed indicator on the Quest button in the server list.",
        default: defaultQuestButtonUnclaimed, // "pill", "badge", "both", "none"
        hidden: true,
    },
    questButtonBadgeColor: {
        type: OptionType.NUMBER | OptionType.CUSTOM,
        description: "The color of the Quest button badge in the server list.",
        default: defaultUnclaimedColor, // Decimal, null (Discord Default)
        hidden: true
    },
    questButtonLeftClickAction: {
        type: OptionType.STRING,
        description: "The action to perform when left-clicking the Quest button in the server list.",
        default: defaultLeftClickAction, // "open-quests", "context-menu", "plugin-settings", "nothing"
        hidden: true
    },
    questButtonMiddleClickAction: {
        type: OptionType.STRING,
        description: "The action to perform when middle-clicking the Quest button in the server list.",
        default: defaultMiddleClickAction, // "open-quests", "context-menu", "plugin-settings", "nothing"
        hidden: true
    },
    questButtonRightClickAction: {
        type: OptionType.STRING,
        description: "The action to perform when right-clicking the Quest button in the server list.",
        default: defaultRightClickAction, // "open-quests", "context-menu", "plugin-settings", "nothing"
        hidden: true
    },
    fetchingQuests: {
        type: OptionType.COMPONENT,
        component: (props: { setValue: (value: FetchingQuestsSettingProps) => void; }) => FetchingQuestsSetting(props),
        description: "Fetch Quests from Discord.",
        onChange: (newValue: FetchingQuestsSettingProps) => {
            settings.store.fetchingQuestsInterval = newValue.interval as any;
            settings.store.fetchingQuestsAlert = newValue.alert as any;

            if (!!newValue.interval && autoFetchCompatible()) {
                startAutoFetchingQuests();
            } else {
                stopAutoFetchingQuests();
            }
        }
    },
    fetchingQuestsInterval: {
        type: OptionType.NUMBER | OptionType.CUSTOM,
        description: "The interval in seconds to fetch Quests from Discord.",
        default: 2700, // Digit >= 0, null (Disabled)
        hidden: true
    },
    fetchingQuestsAlert: {
        type: OptionType.STRING | OptionType.CUSTOM,
        description: "The sound to play when new Quests are detected.",
        default: defaultFetchQuestsAlert, // Item from predefined list or a URL to CSP valid audio file.
        hidden: true
    },
    restyleQuests: {
        type: OptionType.COMPONENT,
        component: (props: { setValue: (value: RestyleQuestsSettingProps) => void; }) => RestyleQuestsSetting(props),
        description: "Customize the appearance of Quest tiles in the Quests page.",
        onChange: (newValue: RestyleQuestsSettingProps) => {
            settings.store.restyleQuestsUnclaimed = newValue.unclaimedColor as any;
            settings.store.restyleQuestsClaimed = newValue.claimedColor as any;
            settings.store.restyleQuestsIgnored = newValue.ignoredColor as any;
            settings.store.restyleQuestsExpired = newValue.expiredColor as any;
            settings.store.restyleQuestsGradient = newValue.gradient as "intense" | "default" | "black" | "hide";
            settings.store.restyleQuestsPreload = newValue.preload;
        }
    },
    restyleQuestsUnclaimed: {
        type: OptionType.NUMBER | OptionType.CUSTOM,
        description: "The color of unclaimed Quest tiles in the Quests page.",
        default: defaultUnclaimedColor, // Decimal, null (Discord Default)
        hidden: true
    },
    restyleQuestsClaimed: {
        type: OptionType.NUMBER | OptionType.CUSTOM,
        description: "The color of claimed Quest tiles in the Quests page.",
        default: defaultClaimedColor, // Decimal, null (Discord Default)
        hidden: true
    },
    restyleQuestsIgnored: {
        type: OptionType.NUMBER | OptionType.CUSTOM,
        description: "The color of ignored Quest tiles in the Quests page.",
        default: defaultIgnoredColor, // Decimal, null (Discord Default)
        hidden: true
    },
    restyleQuestsExpired: {
        type: OptionType.NUMBER | OptionType.CUSTOM,
        description: "The color of expired Quest tiles in the Quests page.",
        default: defaultExpiredColor, // Decimal, null (Discord Default)
        hidden: true
    },
    restyleQuestsGradient: {
        type: OptionType.STRING,
        description: "Style of the gradient used in the Quest tiles.",
        default: defaultRestyleQuestsGradient, // "intense", "default", "black", "hide"
        hidden: true
    },
    restyleQuestsPreload: {
        type: OptionType.BOOLEAN,
        description: "Attempt to preload the assets for the Quest tiles.",
        default: true, // true or false
        hidden: true
    },
    reorderQuests: {
        type: OptionType.COMPONENT,
        description: "Sort Quests by their status. Leave empty for default sorting. Comma-separated list must contain all of: UNCLAIMED, CLAIMED, IGNORED, EXPIRED.",
        default: defaultQuestORder,
        component: (props: { setValue: (value: string) => void; }) => ReorderQuestsSetting(props),
    },
    ignoredQuests: {
        type: OptionType.COMPONENT,
        default: "",
        component: props => IgnoredQuestsSetting(props),
        onChange: (newValue: string) => { validateIgnoredQuests(newValue); }
    },
    unclaimedUnignoredQuests: {
        type: OptionType.NUMBER,
        description: "Tracks the number of unclaimed and unignored Quests.",
        default: 0, // Digit >= 0
        hidden: true
    },
    onQuestsPage: {
        type: OptionType.BOOLEAN,
        description: "Whether the user is currently on the quests page.",
        default: false,
        hidden: true
    }
});
