/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { plugins } from "@api/PluginManager";
import { ErrorBoundary } from "@components/index";
import { findComponentByCodeLazy } from "@webpack";
import { ContextMenuApi, Menu, NavigationRouter, useState } from "@webpack/common";
import type { CSSProperties, JSX, MouseEvent } from "react";

import { getQuestifySettings, useQuestifySettings } from "../settings/access";
import type { QuestButtonAction, QuestButtonDisplayMode, QuestButtonIndicatorMode } from "../settings/def";
import { getIgnoredQuestIDs, ignoreAllQuests, resetIgnoredQuests } from "../settings/ignoredQuests";
import { initialQuestDataFetched } from "../state";
import { fetchAndAlertQuests } from "../utils/fetching";
import { decimalToRGB, formatLowerBadge, isDarkish, leftClick, middleClick, q, QUEST_PAGE, rightClick } from "../utils/ui";
import { openQuestifySettingsModal } from "./settingsModal";

const GuildlessServerListItemComponent = findComponentByCodeLazy("tooltip:", "lowerBadgeSize:");
const ServerListItemPillComponent = findComponentByCodeLazy('"pill":"empty"');
const ServerListItemLowerBadgeComponent = findComponentByCodeLazy("BADGE_NOTIFICATION_BACKGROUND", "let{count:");

interface QuestButtonLowerBadgeProps {
    count: number;
    color?: string;
    style?: CSSProperties;
    maxDigits?: number;
}

interface QuestButtonViewProps {
    id: string;
    className: string;
    badgeProps: QuestButtonLowerBadgeProps;
    hasUnread: boolean;
    selected: boolean;
    visible: boolean;
    onPress: (event: MouseEvent<Element>) => void;
}

export function QuestIcon(height: number, width: number, className?: string): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            height={height}
            width={width}
            fill="none"
            className={className}
        >
            <path fill="currentColor" d="M7.5 21.7a8.95 8.95 0 0 1 9 0 1 1 0 0 0 1-1.73c-.6-.35-1.24-.64-1.9-.87.54-.3 1.05-.65 1.52-1.07a3.98 3.98 0 0 0 5.49-1.8.77.77 0 0 0-.24-.95 3.98 3.98 0 0 0-2.02-.76A4 4 0 0 0 23 10.47a.76.76 0 0 0-.71-.71 4.06 4.06 0 0 0-1.6.22 3.99 3.99 0 0 0 .54-5.35.77.77 0 0 0-.95-.24c-.75.36-1.37.95-1.77 1.67V6a4 4 0 0 0-4.9-3.9.77.77 0 0 0-.6.72 4 4 0 0 0 3.7 4.17c.89 1.3 1.3 2.95 1.3 4.51 0 3.66-2.75 6.5-6 6.5s-6-2.84-6-6.5c0-1.56.41-3.21 1.3-4.51A4 4 0 0 0 11 2.82a.77.77 0 0 0-.6-.72 4.01 4.01 0 0 0-4.9 3.96A4.02 4.02 0 0 0 3.73 4.4a.77.77 0 0 0-.95.24 3.98 3.98 0 0 0 .55 5.35 4 4 0 0 0-1.6-.22.76.76 0 0 0-.72.71l-.01.28a4 4 0 0 0 2.65 3.77c-.75.06-1.45.33-2.02.76-.3.22-.4.62-.24.95a4 4 0 0 0 5.49 1.8c.47.42.98.78 1.53 1.07-.67.23-1.3.52-1.91.87a1 1 0 1 0 1 1.73Z" />
        </svg>
    );
}

function splitClassNames(className: string): string[] {
    const classNames = className.split(/\s+/).filter(Boolean);

    return classNames.length ? classNames : [q("quest-button")];
}

function suffixClassNames(classNames: string[], suffix: string): string {
    return classNames.map(className => `${className}-${suffix}`).join(" ");
}

function QuestButtonLowerBadge(props: QuestButtonLowerBadgeProps & { className: string; }): JSX.Element {
    return <ServerListItemLowerBadgeComponent {...props} />;
}

function QuestButtonView({
    id,
    className,
    badgeProps,
    hasUnread,
    selected,
    visible,
    onPress,
}: QuestButtonViewProps): JSX.Element {
    const [hovered, setHovered] = useState(false);
    const baseClasses = splitClassNames(className);
    const mainContainerClass = suffixClassNames(baseClasses, "container");
    const iconContainerClass = suffixClassNames(baseClasses, "icon-container");
    const buttonContainerClass = suffixClassNames(baseClasses, "server-list-button-container");
    const pillContainerClass = suffixClassNames(baseClasses, "pill-container");
    const buttonClass = suffixClassNames(baseClasses, "button");
    const pillClass = suffixClassNames(baseClasses, "pill");
    const lowerBadgeClass = suffixClassNames(baseClasses, "lower-badge");
    const lowerBadgeSize = { width: formatLowerBadge(badgeProps.count, badgeProps.maxDigits)[1] };
    const lowerBadge = badgeProps.count === 0
        ? null
        : (
            <QuestButtonLowerBadge
                {...badgeProps}
                className={lowerBadgeClass}
                style={{ ...(badgeProps.style ?? {}), ...lowerBadgeSize }}
            />
        );
    const icon = (
        <div className={iconContainerClass}>
            {QuestIcon(26, 26)}
        </div>
    );

    return (
        <ErrorBoundary>
            {visible && (
                <div id={id} className={mainContainerClass}>
                    <div className={pillContainerClass}>
                        <ServerListItemPillComponent
                            unread={hasUnread}
                            selected={selected}
                            hovered={hovered}
                            className={`${pillClass}${selected ? " selected" : hovered ? " hovered" : ""}`}
                        />
                    </div>
                    <div className={buttonContainerClass}>
                        <GuildlessServerListItemComponent
                            icon={() => icon}
                            tooltip="Quests"
                            showPill={false}
                            selected={selected}
                            className={buttonClass}
                            onClick={onPress}
                            onMouseDown={onPress}
                            onContextMenu={onPress}
                            onMouseEnter={() => setHovered(true)}
                            onMouseLeave={() => setHovered(false)}
                            {...(lowerBadge ? { lowerBadge, lowerBadgeSize } : {})}
                        />
                    </div>
                </div>
            )}
        </ErrorBoundary>
    );
}

export function showQuestButton(displayMode: QuestButtonDisplayMode, badgeCount: number, isOnQuestsPage: boolean): boolean {
    return displayMode !== "never" && (displayMode === "always" || badgeCount > 0 || isOnQuestsPage);
}

export function disguiseHomeButton(pathname: string): boolean {
    const buttonSettings = useQuestifySettings(["questButtonDisplay", "questButtonBadgeCount", "isOnQuestsPage"]);

    if (!showQuestButton(buttonSettings.questButtonDisplay, buttonSettings.questButtonBadgeCount, buttonSettings.isOnQuestsPage)) {
        return false;
    }

    return pathname === QUEST_PAGE;
}

function resolveQuestButtonAction(
    event: MouseEvent<Element>,
    leftAction: QuestButtonAction,
    middleAction: QuestButtonAction,
    rightAction: QuestButtonAction,
): QuestButtonAction | null {
    if (event.button === middleClick) {
        return middleAction;
    }

    if (event.button === rightClick) {
        return rightAction;
    }

    if (event.button === leftClick) {
        return leftAction;
    }

    return null;
}

function getQuestButtonLowerBadgeProps(
    badgeCount: number,
    indicatorMode: QuestButtonIndicatorMode,
    badgeColor: number | null,
): QuestButtonLowerBadgeProps {
    const resolvedColor = badgeColor === null ? null : decimalToRGB(badgeColor);

    return {
        count: indicatorMode === "badge" || indicatorMode === "both" ? badgeCount : 0,
        maxDigits: 2,
        ...(resolvedColor
            ? { color: `rgb(${resolvedColor.r}, ${resolvedColor.g}, ${resolvedColor.b})` }
            : {}),
        ...(resolvedColor
            ? { style: { color: isDarkish(resolvedColor) ? "white" : "black" } }
            : {}),
    };
}

export function QuestButtonContextMenu({ dummy = false }: { dummy?: boolean; }): JSX.Element {
    const navId = q(dummy ? "dummy-quest-button-context-menu" : "quest-button-context-menu");
    const markAllIgnoredDisabled = dummy || getQuestifySettings().questButtonBadgeCount <= 0;
    const resetIgnoredDisabled = dummy || getIgnoredQuestIDs().length <= 0;
    const fetchQuestsDisabled = dummy;

    return (
        <Menu.Menu
            navId={navId}
            onClose={ContextMenuApi.closeContextMenu}
            aria-label="Quest Button Menu"
        >
            <Menu.MenuItem
                id={q(`${navId}-mark-all-ignored`)}
                label="Mark All Ignored"
                action={ignoreAllQuests}
                disabled={markAllIgnoredDisabled}
            />
            <Menu.MenuItem
                id={q(`${navId}-reset-ignored-list`)}
                label="Reset Ignored List"
                action={resetIgnoredQuests}
                disabled={resetIgnoredDisabled}
            />
            <Menu.MenuItem
                id={q(`${navId}-fetch-quests`)}
                label="Fetch Quests"
                action={() => { void fetchAndAlertQuests("MANUAL_FETCH"); }}
                disabled={fetchQuestsDisabled}
            />
        </Menu.Menu>
    );
}

export function QuestButton(): JSX.Element {
    const {
        isOnQuestsPage,
        questButtonBadgeColor,
        questButtonDisplay,
        questButtonBadgeCount,
        questButtonLeftClickAction,
        questButtonMiddleClickAction,
        questButtonRightClickAction,
        questButtonIndicator,
    } = useQuestifySettings([
        "isOnQuestsPage",
        "questButtonBadgeColor",
        "questButtonDisplay",
        "questButtonBadgeCount",
        "questButtonLeftClickAction",
        "questButtonMiddleClickAction",
        "questButtonRightClickAction",
        "questButtonIndicator",
    ]);

    const staleData = !initialQuestDataFetched;
    const badgeColor = questButtonBadgeColor;
    const badgeCount = staleData ? 0 : questButtonBadgeCount;
    const onQuestsPage = staleData ? false : isOnQuestsPage;
    const displayMode = questButtonDisplay as QuestButtonDisplayMode;
    const leftClickAction = questButtonLeftClickAction as QuestButtonAction;
    const middleClickAction = questButtonMiddleClickAction as QuestButtonAction;
    const rightClickAction = questButtonRightClickAction as QuestButtonAction;
    const indicatorMode = questButtonIndicator as QuestButtonIndicatorMode;

    const lowerBadgeProps = getQuestButtonLowerBadgeProps(badgeCount, indicatorMode, badgeColor);
    const hasUnread = indicatorMode === "pill" || indicatorMode === "both";
    const isVisible = showQuestButton(displayMode, badgeCount, onQuestsPage);

    function handlePress(event: MouseEvent<Element>): void {
        // List items do not support onAuxClick, so middle-click is handled on mousedown.
        if (event.type === "mousedown" && event.button !== middleClick) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action = resolveQuestButtonAction(
            event,
            leftClickAction,
            middleClickAction,
            rightClickAction,
        );

        if (action === "open-quests") {
            NavigationRouter.transitionTo(QUEST_PAGE);

            return;
        }

        if (action === "plugin-settings") {
            openQuestifySettingsModal(plugins.Questify);

            return;
        }

        if (action === "context-menu") {
            ContextMenuApi.openContextMenu(event, () => <QuestButtonContextMenu />);
        }
    }

    return (
        <QuestButtonView
            id={q("quest-button")}
            className={q("quest-button")}
            selected={onQuestsPage}
            visible={isVisible}
            hasUnread={badgeCount > 0 && hasUnread}
            badgeProps={lowerBadgeProps}
            onPress={handlePress}
        />
    );
}

export interface DummyQuestButtonProps {
    badgeColor: number | null;
    leftClickAction: QuestButtonAction;
    middleClickAction: QuestButtonAction;
    rightClickAction: QuestButtonAction;
    showBadge: boolean;
    showPill: boolean;
    visible: boolean;
}

export function DummyQuestButton({
    badgeColor,
    leftClickAction,
    middleClickAction,
    rightClickAction,
    showBadge,
    showPill,
    visible,
}: DummyQuestButtonProps): JSX.Element {
    const badgeCount = showBadge ? 3 : 0;
    const indicatorMode = showBadge ? (showPill ? "both" : "badge") : (showPill ? "pill" : "none");
    const lowerBadgeProps = getQuestButtonLowerBadgeProps(badgeCount, indicatorMode, badgeColor);
    const [dummySelected, setDummySelected] = useState(false);

    function handlePress(event: MouseEvent<Element>): void {
        // List items do not support onAuxClick, so middle-click is handled on mousedown.
        if (event.type === "mousedown" && event.button !== middleClick) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action = resolveQuestButtonAction(
            event,
            leftClickAction,
            middleClickAction,
            rightClickAction,
        );

        if (action === "open-quests") {
            setDummySelected(!dummySelected);

            return;
        }

        if (action === "context-menu") {
            ContextMenuApi.openContextMenu(event, () => <QuestButtonContextMenu dummy={true} />);
        }
    }

    return (
        <QuestButtonView
            id={q("dummy-quest-button")}
            className={q("dummy-quest-button", "quest-button")}
            selected={dummySelected}
            visible={visible}
            hasUnread={showPill}
            badgeProps={lowerBadgeProps}
            onPress={handlePress}
        />
    );
}
