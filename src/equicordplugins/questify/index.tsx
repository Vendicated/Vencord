/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { showNotification } from "@api/Notifications";
import { plugins } from "@api/PluginManager";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { migratePluginToSettings, Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { openPluginModal } from "@components/settings";
import { EquicordDevs } from "@utils/constants";
import { copyToClipboard } from "@utils/index";
import definePlugin, { PluginNative, StartAt } from "@utils/types";
import { onceReady } from "@webpack";
import { ContextMenuApi, Menu, NavigationRouter, RestAPI, useEffect, useState } from "@webpack/common";
import { JSX } from "react";

import { addIgnoredQuest, addRerenderCallback, autoFetchCompatible, fetchAndAlertQuests, maximumAutoFetchIntervalValue, minimumAutoFetchIntervalValue, questIsIgnored, removeIgnoredQuest, rerenderQuests, settings, startAutoFetchingQuests, stopAutoFetchingQuests, validateAndOverwriteIgnoredQuests } from "./settings";
import { ActiveQuestIntervalsMap, ExcludedQuestMap, GuildlessServerListItem, Quest, QuestIcon, QuestMap, QuestStatus, QuestTaskType, RGB } from "./utils/components";
import { adjustRGB, decimalToRGB, fetchAndDispatchQuests, formatLowerBadge, getFormattedNow, getIgnoredQuestIDs, getQuestProgress, getQuestStatus, getQuestTarget, getQuestTask, isDarkish, leftClick, middleClick, normalizeQuestName, q, QuestifyLogger, questPath, QuestsStore, refreshQuest, reportPlayGameQuestProgress, reportVideoQuestProgress, rightClick, setIgnoredQuestIDs, videoQuestLeeway, waitUntilEnrolled } from "./utils/misc";

let initialQuestDataFetched = false;
const QuestifyNative = VencordNative.pluginHelpers.Questify as PluginNative<typeof import("./native")>;
const patchedMobileQuests = new Set<string>();
export const activeQuestIntervals = new ActiveQuestIntervalsMap();

function questMenuUnignoreAllClicked(): void {
    validateAndOverwriteIgnoredQuests([]);
}

function questMenuIgnoreAllClicked(): void {
    const quests = (QuestsStore.quests as QuestMap);
    const excludedQuests = (QuestsStore.excludedQuests as ExcludedQuestMap);
    const ignoredQuestsSet = new Set<string>();
    const ignoredQuestIDs = getIgnoredQuestIDs();

    for (const quest of quests.values()) {
        const questID = quest.id;
        const questStatus = getQuestStatus(quest, false);

        if (questStatus === QuestStatus.Unclaimed || ignoredQuestIDs.includes(questID)) {
            ignoredQuestsSet.add(questID);
        }
    }

    for (const quest of excludedQuests.values()) {
        if (ignoredQuestIDs.includes(quest.id)) {
            ignoredQuestsSet.add(quest.id);
        }
    }

    setIgnoredQuestIDs(Array.from(ignoredQuestsSet));
    settings.store.unclaimedUnignoredQuests = 0;
}

function showQuestsButton(questButtonDisplay: string, unclaimedUnignoredQuests: number, onQuestsPage: boolean): boolean {
    const canShow = questButtonDisplay !== "never";
    const alwaysShow = questButtonDisplay === "always";
    return canShow && (alwaysShow || !!unclaimedUnignoredQuests || onQuestsPage);
}

export function QuestButton(): JSX.Element {
    const { questButtonDisplay, questButtonUnclaimed, questButtonBadgeColor, unclaimedUnignoredQuests, onQuestsPage } = settings.use(["questButtonDisplay", "questButtonUnclaimed", "questButtonBadgeColor", "unclaimedUnignoredQuests", "onQuestsPage"]);
    const questButtonBadgeColorRGB = questButtonBadgeColor === null ? null : decimalToRGB(questButtonBadgeColor);

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
            todo = settings.store.questButtonMiddleClickAction;
        } else if (event.button === rightClick) {
            todo = settings.store.questButtonRightClickAction;
        } else if (event.button === leftClick) {
            todo = settings.store.questButtonLeftClickAction;
        }

        if (todo === "open-quests") {
            NavigationRouter.transitionTo(questPath);
        } else if (todo === "plugin-settings") {
            openPluginModal(plugins.Questify);
        } else if (todo === "context-menu") {
            ContextMenuApi.openContextMenu(event, () => (
                <Menu.Menu
                    navId={q("quest-button-context-menu")}
                    onClose={ContextMenuApi.closeContextMenu}
                    aria-label="Quest Button Menu"
                >
                    <Menu.MenuItem
                        id={q("ignore-quests-option")}
                        label="Mark All Ignored"
                        action={questMenuIgnoreAllClicked}
                        disabled={!unclaimedUnignoredQuests}
                    />
                    <Menu.MenuItem
                        id={q("unignore-quests-option")}
                        label="Reset Ignored List"
                        action={questMenuUnignoreAllClicked}
                        disabled={!getIgnoredQuestIDs().length}
                    />
                    <Menu.MenuItem
                        id={q("fetch-quests-option")}
                        label="Fetch Quests"
                        action={() => fetchAndAlertQuests("Questify-ManualFetch", QuestifyLogger)}
                    />
                </Menu.Menu>
            ));
        }
    }

    const lowerBadgeProps = {
        count: !["badge", "both"].includes(questButtonUnclaimed) ? 0 : unclaimedUnignoredQuests,
        maxDigits: 2,
        ...(questButtonBadgeColorRGB ? { color: `rgb(${questButtonBadgeColorRGB.r}, ${questButtonBadgeColorRGB.g}, ${questButtonBadgeColorRGB.b})` } : {}),
        ...(questButtonBadgeColorRGB ? { style: { color: isDarkish(questButtonBadgeColorRGB) ? "white" : "black" } } : {})
    };

    return (
        <GuildlessServerListItem
            id={q("quest-button")}
            className={q("quest-button")}
            icon={QuestIcon(26, 26)}
            tooltip="Quests"
            showPill={true}
            isVisible={showQuestsButton(questButtonDisplay, unclaimedUnignoredQuests, onQuestsPage)}
            isSelected={onQuestsPage}
            hasUnread={!!unclaimedUnignoredQuests && ["pill", "both"].includes(questButtonUnclaimed)}
            lowerBadgeProps={lowerBadgeProps}
            onClick={handleClick}
            onContextMenu={handleClick}
            onMouseDown={handleClick}
        />
    );
}

function shouldHideGiftInventoryRelocationNotice(): boolean {
    const {
        disableQuestsGiftInventoryRelocationNotice,
        disableQuestsEverything
    } = settings.use([
        "disableQuestsGiftInventoryRelocationNotice",
        "disableQuestsEverything"
    ]);

    return disableQuestsGiftInventoryRelocationNotice || disableQuestsEverything;
}

function shouldHideDiscoveryTab(): boolean {
    const {
        disableQuestsDiscoveryTab,
        disableQuestsEverything
    } = settings.use([
        "disableQuestsDiscoveryTab",
        "disableQuestsEverything"
    ]);

    return disableQuestsDiscoveryTab || disableQuestsEverything;
}

function shouldHideDirectMessagesTab(): boolean {
    const {
        disableQuestsDirectMessagesTab,
        disableQuestsEverything
    } = settings.use([
        "disableQuestsDirectMessagesTab",
        "disableQuestsEverything"
    ]);

    return disableQuestsDirectMessagesTab || disableQuestsEverything;
}

function shouldHideSponsoredQuestBanner(): boolean {
    const {
        disableQuestsPageSponsoredBanner,
        disableQuestsEverything
    } = settings.use([
        "disableQuestsPageSponsoredBanner",
        "disableQuestsEverything"
    ]);

    return disableQuestsPageSponsoredBanner || disableQuestsEverything;
}

function shouldHideBadgeOnUserProfiles(): boolean {
    const {
        disableQuestsBadgeOnUserProfiles,
        disableQuestsEverything
    } = settings.use([
        "disableQuestsBadgeOnUserProfiles",
        "disableQuestsEverything"
    ]);

    return disableQuestsBadgeOnUserProfiles || disableQuestsEverything;
}

function shouldHideQuestPopup(quest: Quest | null): boolean {
    const {
        disableQuestsPopupAboveAccountPanel,
        disableQuestsEverything
    } = settings.use([
        "disableQuestsPopupAboveAccountPanel",
        "disableQuestsEverything",
        "triggerQuestsRerender"
    ]);

    const noProgress = !quest?.userStatus?.progress || Object.keys(quest?.userStatus?.progress || {}).length === 0;
    return !quest || ((disableQuestsPopupAboveAccountPanel || disableQuestsEverything) && noProgress);
}

function shouldPreventFetchingQuests(): boolean {
    return settings.store.disableQuestsFetchingQuests || settings.store.disableQuestsEverything;
}

function shouldHideFriendsListActiveNowPromotion(): boolean {
    const {
        disableFriendsListActiveNowPromotion,
        disableQuestsEverything
    } = settings.use([
        "disableFriendsListActiveNowPromotion",
        "disableQuestsEverything"
    ]);

    return disableFriendsListActiveNowPromotion || disableQuestsEverything;
}

function shouldHideMembersListActivelyPlayingIcon(): boolean {
    const {
        disableMembersListActivelyPlayingIcon,
        disableQuestsEverything
    } = settings.use([
        "disableMembersListActivelyPlayingIcon",
        "disableQuestsEverything"
    ]);

    return disableMembersListActivelyPlayingIcon || disableQuestsEverything;
}

function QuestTileContextMenu(children: React.ReactNode[], props: { quest: any; }, isClaimedMenu: boolean = false): void {
    const isIgnored = questIsIgnored(props.quest.id);
    const isEnrolled = !!props.quest.userStatus?.enrolledAt;
    const canAutoComplete = !isClaimedMenu && isEnrolled && canQuestAutoComplete(props.quest);

    children.unshift((
        <Menu.MenuGroup>
            {!isClaimedMenu && (!isIgnored ? (
                <Menu.MenuItem
                    id={q("ignore-quests")}
                    label="Mark as Ignored"
                    action={() => { addIgnoredQuest(props.quest.id); }}
                />
            ) : (
                <Menu.MenuItem
                    id={q("unignore-quests")}
                    label="Unmark as Ignored"
                    action={() => { removeIgnoredQuest(props.quest.id); }}
                />
            ))}
            {activeQuestIntervals.has(props.quest.id) ? (
                <Menu.MenuItem
                    id={q("stop-auto-complete")}
                    label="Stop Auto-Complete"
                    action={() => {
                        const interval = activeQuestIntervals.get(props.quest.id);

                        if (interval) {
                            clearInterval(interval.progressTimeout);
                            clearTimeout(interval.rerenderTimeout);
                            activeQuestIntervals.delete(props.quest.id);
                            rerenderQuests();
                        }
                    }}
                />) : canAutoComplete ? (
                    <Menu.MenuItem
                        id={q("start-auto-complete")}
                        label="Start Auto-Complete"
                        action={() => { processQuestForAutoComplete(props.quest); }}
                    />) : null
            }
            <Menu.MenuItem
                id={q("copy-quest-id")}
                label="Copy Quest ID"
                action={() => { copyToClipboard(props.quest.id); }}
            />
        </Menu.MenuGroup>
    ));
}

export function getQuestTileClasses(originalClasses: string, quest: Quest, color: number | null | undefined, gradient: string | undefined): string {
    const {
        restyleQuestsUnclaimed,
        restyleQuestsClaimed,
        restyleQuestsIgnored,
        restyleQuestsExpired,
        restyleQuestsGradient
    } = settings.use([
        "ignoredQuestIDs",
        "ignoredQuestProfile",
        "restyleQuestsUnclaimed",
        "restyleQuestsClaimed",
        "restyleQuestsIgnored",
        "restyleQuestsExpired",
        "restyleQuestsGradient"
    ]);

    const customClasses = [
        q("quest-item-restyle"),
        q("quest-item-intense-gradient"),
        q("quest-item-default-gradient"),
        q("quest-item-black-gradient"),
        q("quest-item-hide-gradient"),
        q("quest-item-contrast-logo")
    ];

    if (originalClasses.includes(q("dummy-quest"))) {
        return originalClasses;
    }

    const questStatus = getQuestStatus(quest);
    const baseClasses = originalClasses.split(" ").filter(cls => cls && !customClasses.includes(cls));
    const returnClasses: string[] = [...baseClasses];
    const hasColorOverride = color !== undefined;
    const skipColorCheck = hasColorOverride && color === null;
    let isRestyledAndDarkish: any = null;

    if (!skipColorCheck) {
        if (questStatus === QuestStatus.Claimed && (color || restyleQuestsClaimed !== null)) {
            returnClasses.push(q("quest-item-restyle"));
            isRestyledAndDarkish = isDarkish(decimalToRGB(color ?? restyleQuestsClaimed), 0.875);
        } else if (questStatus === QuestStatus.Unclaimed && (color || restyleQuestsUnclaimed !== null)) {
            returnClasses.push(q("quest-item-restyle"));
            isRestyledAndDarkish = isDarkish(decimalToRGB(color ?? restyleQuestsUnclaimed), 0.875);
        } else if (questStatus === QuestStatus.Expired && (color || restyleQuestsExpired !== null)) {
            returnClasses.push(q("quest-item-restyle"));
            isRestyledAndDarkish = isDarkish(decimalToRGB(color ?? restyleQuestsExpired), 0.875);
        } else if (questStatus === QuestStatus.Ignored && (color || restyleQuestsIgnored !== null)) {
            returnClasses.push(q("quest-item-restyle"));
            isRestyledAndDarkish = isDarkish(decimalToRGB(color ?? restyleQuestsIgnored), 0.875);
        }
    }

    if (isRestyledAndDarkish !== null) {
        if ((gradient || restyleQuestsGradient) === "black") {
            returnClasses.push(q("quest-item-black-gradient"));
        } else if ((gradient || restyleQuestsGradient) === "hide") {
            returnClasses.push(q("quest-item-hide-gradient"));
        } else {
            if ((gradient || restyleQuestsGradient) === "default") {
                returnClasses.push(q("quest-item-default-gradient"));
            } else {
                returnClasses.push(q("quest-item-intense-gradient"));
            }

            if (!isRestyledAndDarkish) {
                returnClasses.push(q("quest-item-contrast-logo"));
            }
        }
    }

    return returnClasses.join(" ");
}

function makeDesktopCompatible(quests: Quest[]): void {
    const { makeMobileQuestsDesktopCompatible } = settings.use(["makeMobileQuestsDesktopCompatible", "triggerQuestsRerender"]);

    if (makeMobileQuestsDesktopCompatible) {
        quests.forEach(quest => {
            const config = quest.config?.taskConfigV2;
            const tasks = config?.tasks;

            if (tasks?.WATCH_VIDEO_ON_MOBILE && (!tasks?.WATCH_VIDEO || patchedMobileQuests.has(quest.id))) {
                patchedMobileQuests.add(quest.id);

                tasks.WATCH_VIDEO = {
                    ...tasks.WATCH_VIDEO_ON_MOBILE,
                    type: QuestTaskType.WATCH_VIDEO
                };
            }
        });
    } else if (patchedMobileQuests.size > 0) {
        patchedMobileQuests.forEach(questId => {
            const quest = quests.find(q => q.id === questId);
            const config = quest?.config?.taskConfigV2;

            if (config) {
                delete config.tasks.WATCH_VIDEO;
            }
        });

        patchedMobileQuests.clear();
    }
}

function sortQuests(quests: Quest[], skip?: boolean): Quest[] {
    const {
        reorderQuests,
        unclaimedSubsort,
        claimedSubsort,
        ignoredSubsort,
        expiredSubsort,
    } = settings.use([
        "ignoredQuestIDs",
        "ignoredQuestProfile",
        "reorderQuests",
        "unclaimedSubsort",
        "claimedSubsort",
        "ignoredSubsort",
        "expiredSubsort",
        "completeVideoQuestsInBackground",
        "completeGameQuestsInBackground",
        "completeAchievementQuestsInBackground",
        "triggerQuestsRerender"
    ]);

    makeDesktopCompatible(quests);

    if (skip || !reorderQuests?.trim()) {
        return quests;
    }

    const orderList = reorderQuests.split(",").map(q => q.trim().toLowerCase());

    const questGroups: { [key: string]: Quest[]; } = {
        claimed: [],
        expired: [],
        ignored: [],
        unclaimed: [],
        unknown: []
    };

    quests.forEach(quest => {
        const questStatus = getQuestStatus(quest);

        if (questStatus === QuestStatus.Claimed) {
            questGroups.claimed.push(quest);
        } else if (questStatus === QuestStatus.Unclaimed) {
            questGroups.unclaimed.push(quest);
        } else if (questStatus === QuestStatus.Expired) {
            questGroups.expired.push(quest);
        } else if (questStatus === QuestStatus.Ignored) {
            questGroups.ignored.push(quest);
        } else {
            questGroups.unknown.push(quest);
        }
    });

    const createSortFunction = (subsort: string) => {
        switch (subsort) {
            case "Recent ASC":
                return (a: Quest, b: Quest) => new Date(a.config.startsAt).getTime() - new Date(b.config.startsAt).getTime();
            case "Recent DESC":
                return (a: Quest, b: Quest) => new Date(b.config.startsAt).getTime() - new Date(a.config.startsAt).getTime();
            case "Expiring ASC":
                return (a: Quest, b: Quest) => new Date(a.config.expiresAt).getTime() - new Date(b.config.expiresAt).getTime();
            case "Expiring DESC":
                return (a: Quest, b: Quest) => new Date(b.config.expiresAt).getTime() - new Date(a.config.expiresAt).getTime();
            case "Claimed ASC":
                return (a: Quest, b: Quest) => new Date(a.userStatus?.claimedAt || 0).getTime() - new Date(b.userStatus?.claimedAt || 0).getTime();
            case "Claimed DESC":
                return (a: Quest, b: Quest) => new Date(b.userStatus?.claimedAt || 0).getTime() - new Date(a.userStatus?.claimedAt || 0).getTime();
            default:
                return (a: Quest, b: Quest) => new Date(b.config.startsAt).getTime() - new Date(a.config.startsAt).getTime();
        }
    };

    const unclaimedSortFunction = createSortFunction(unclaimedSubsort || "Recent DESC");

    // Divide unclaimed Quests by completion status before applying subsort.
    questGroups.unclaimed.sort((a: Quest, b: Quest) => {
        const aCompleted = !!a.userStatus?.completedAt;
        const bCompleted = !!b.userStatus?.completedAt;

        if (aCompleted !== bCompleted) {
            return aCompleted ? 1 : -1;
        }

        return unclaimedSortFunction(a, b);
    });

    questGroups.claimed.sort(createSortFunction(claimedSubsort || "Claimed DESC"));
    questGroups.ignored.sort(createSortFunction(ignoredSubsort || "Recent DESC"));
    questGroups.expired.sort(createSortFunction(expiredSubsort || "Expiring DESC"));

    const sortedQuests: Quest[] = [];

    orderList.forEach(status => {
        if (questGroups[status]) {
            sortedQuests.push(...questGroups[status]);
        }
    });

    Object.keys(questGroups).forEach(status => {
        if (!orderList.includes(status)) {
            sortedQuests.push(...questGroups[status]);
        }
    });

    return sortedQuests;
}

export function getQuestTileStyle(quest: Quest | null): Record<string, string> {
    settings.use([
        "restyleQuests",
        "ignoredQuestIDs",
        "ignoredQuestProfile"
    ]);

    const style: Record<string, string> = {};
    let themeColor: RGB | null = null;

    const restyleUnclaimed = settings.store.restyleQuestsUnclaimed;
    const restyleClaimed = settings.store.restyleQuestsClaimed;
    const restyleIgnored = settings.store.restyleQuestsIgnored;
    const restyleExpired = settings.store.restyleQuestsExpired;

    const claimedColor = restyleClaimed !== null ? decimalToRGB(restyleClaimed) : "";
    const unclaimedColor = restyleUnclaimed !== null ? decimalToRGB(restyleUnclaimed) : "";
    const ignoredColor = restyleIgnored !== null ? decimalToRGB(restyleIgnored) : "";
    const expiredColor = restyleExpired !== null ? decimalToRGB(restyleExpired) : "";
    const dummyProvided = quest?.dummyColor !== undefined;
    const dummyColor = (quest?.dummyColor !== undefined && quest?.dummyColor !== null) ? decimalToRGB(quest.dummyColor) : null;
    const questStatus = quest ? getQuestStatus(quest) : null;

    if (questStatus === QuestStatus.Claimed) {
        themeColor = dummyProvided ? dummyColor : claimedColor || null;
    } else if (questStatus === QuestStatus.Unclaimed) {
        themeColor = dummyProvided ? dummyColor : unclaimedColor || null;
    } else if (questStatus === QuestStatus.Expired) {
        themeColor = dummyProvided ? dummyColor : expiredColor || null;
    } else if (questStatus === QuestStatus.Ignored) {
        themeColor = dummyProvided ? dummyColor : ignoredColor || null;
    }

    if (!themeColor) return style;

    const darkish = isDarkish(themeColor);
    const sign = darkish ? 1 : -1;
    const questNameColor = adjustRGB(themeColor, 200 * sign);
    const rewardTitleColor = adjustRGB(themeColor, 150 * sign);
    const rewardDescriptionColor = adjustRGB(themeColor, 100 * sign);
    const buttonNormalColor = adjustRGB(themeColor, 50 * sign);
    const buttonHoverColor = adjustRGB(themeColor, 75 * sign);

    style["--questify-color"] = `rgb(${themeColor.r}, ${themeColor.g}, ${themeColor.b})`;
    style["--questify-quest-name"] = `rgb(${questNameColor.r}, ${questNameColor.g}, ${questNameColor.b})`;
    style["--questify-reward-title"] = `rgb(${rewardTitleColor.r}, ${rewardTitleColor.g}, ${rewardTitleColor.b})`;
    style["--questify-reward-description"] = `rgb(${rewardDescriptionColor.r}, ${rewardDescriptionColor.g}, ${rewardDescriptionColor.b})`;
    style["--questify-button-normal"] = `rgb(${buttonNormalColor.r}, ${buttonNormalColor.g}, ${buttonNormalColor.b})`;
    style["--questify-button-hover"] = `rgb(${buttonHoverColor.r}, ${buttonHoverColor.g}, ${buttonHoverColor.b})`;

    return style;
}

function shouldPreloadQuestAssets(): boolean {
    const { restyleQuestsPreload } = settings.use(["restyleQuestsPreload"]);
    return restyleQuestsPreload;
}

async function startVideoProgressTracking(quest: Quest, target: { raw: number; adjusted: number; }): Promise<void> {
    const questName = normalizeQuestName(quest.config.messages.questName);
    const questEnrolledAt = quest.userStatus?.enrolledAt ? new Date(quest.userStatus.enrolledAt) : null;
    const initialProgress = Math.floor(((new Date()).getTime() - (questEnrolledAt ?? new Date()).getTime()) / 1000) || 1;
    activeQuestIntervals.set(quest.id, { progressTimeout: null as any, rerenderTimeout: null as any, progress: initialProgress, type: "watch" });
    // Max up to ~25 seconds into the future can be reported.
    const { raw: reportTarget, adjusted: questTargetWithLeeway } = target;
    let currentProgress = initialProgress;
    let currentProgressScaled = initialProgress;
    const timeRemaining = Math.max(0, questTargetWithLeeway - currentProgressScaled);

    QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} will be completed in the background in ${timeRemaining} seconds.`);

    if (!questEnrolledAt) {
        const enrollmentTimeout = 60000;
        const enrolled = await waitUntilEnrolled(quest, enrollmentTimeout, 15, QuestifyLogger);
        quest = refreshQuest(quest);

        if (!enrolled) {
            QuestifyLogger.warn(`[${getFormattedNow()}] Quest ${questName} not enrolled within ${enrollmentTimeout / 1000} seconds.`);
            activeQuestIntervals.delete(quest.id);
            return;
        }
    }

    if (!activeQuestIntervals.has(quest.id)) {
        return;
    }

    const reportEverySec = 10;
    let progressIntervalId: NodeJS.Timeout;

    async function handleSendComplete() {
        clearInterval(progressIntervalId);
        clearTimeout(renderIntervalId);
        const success = await reportVideoQuestProgress(quest, reportTarget, QuestifyLogger);
        activeQuestIntervals.delete(quest.id);

        if (success) {
            QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} completed.`);

            if (settings.store.notifyOnQuestComplete) {
                showNotification({
                    title: "Quest Completed!",
                    body: `The ${questName} Quest has completed.`,
                    dismissOnClick: true,
                    onClick: () => NavigationRouter.transitionTo(`${questPath}#${quest.id}`)
                });
            }
        } else {
            QuestifyLogger.error(`[${getFormattedNow()}] Failed to complete Quest ${questName}.`);
        }
    }

    if (timeRemaining < reportEverySec) {
        progressIntervalId = setTimeout(async () => {
            await handleSendComplete();
        }, timeRemaining * 1000);
    } else {
        const simulatedProgressToCover = reportTarget - currentProgressScaled;
        const speedFactor = simulatedProgressToCover / timeRemaining;
        const progressIncrementPerInterval = reportEverySec * speedFactor;
        const numberOfIntervals = Math.floor(timeRemaining / reportEverySec);
        let intervalsRun = 0;

        reportVideoQuestProgress(quest, initialProgress, QuestifyLogger);

        progressIntervalId = setInterval(async () => {
            intervalsRun++;
            currentProgress += reportEverySec;
            currentProgressScaled += progressIncrementPerInterval;
            const progressToReport = Math.min(Math.floor(currentProgressScaled), reportTarget);

            if (intervalsRun < numberOfIntervals || (currentProgress < reportTarget - videoQuestLeeway - (reportEverySec / 2))) {
                await reportVideoQuestProgress(quest, progressToReport, QuestifyLogger);
            }

            if (intervalsRun >= numberOfIntervals) {
                clearInterval(progressIntervalId);

                const timeSpentInIntervals = numberOfIntervals * reportEverySec;
                const finalWaitTime = Math.max(0, timeRemaining - timeSpentInIntervals);
                progressIntervalId = setTimeout(handleSendComplete, finalWaitTime * 1000);

                const intervalData = activeQuestIntervals.get(quest.id);
                if (intervalData) intervalData.progressTimeout = progressIntervalId;
            }
        }, reportEverySec * 1000);
    }

    const renderIntervalId = setInterval(() => {
        const intervalData = activeQuestIntervals.get(quest.id);

        if (!!intervalData) {
            intervalData.progress += 1;
        } else {
            clearInterval(renderIntervalId);
        }

        rerenderQuests();
    }, 1000);

    const intervalData = activeQuestIntervals.get(quest.id);

    if (intervalData) {
        intervalData.progressTimeout = progressIntervalId;
        intervalData.rerenderTimeout = renderIntervalId;
    }
}

async function startPlayGameProgressTracking(quest: Quest, target: { raw: number; adjusted: number; }): Promise<void> {
    const questName = normalizeQuestName(quest.config.messages.questName);
    const questEnrolledAt = quest.userStatus?.enrolledAt ? new Date(quest.userStatus.enrolledAt) : null;
    const task = getQuestTask(quest);
    const questTarget = target.adjusted;
    const initialProgress = getQuestProgress(quest, task) || 0;
    const remaining = Math.max(0, questTarget - initialProgress);
    const heartbeatInterval = 20; // Heartbeats must be at most 2 minutes apart.
    activeQuestIntervals.set(quest.id, { progressTimeout: null as any, rerenderTimeout: null as any, progress: initialProgress, type: "play" });

    QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} will be completed in the background in ${remaining} seconds.`);

    if (!questEnrolledAt) {
        const enrollmentTimeout = 60000;
        const enrolled = await waitUntilEnrolled(quest, enrollmentTimeout, 500, QuestifyLogger);
        quest = refreshQuest(quest);

        if (!enrolled) {
            QuestifyLogger.warn(`[${getFormattedNow()}] Quest ${questName} not enrolled after waiting for ${enrollmentTimeout / 1000} seconds.`);
            activeQuestIntervals.delete(quest.id);
            return;
        }
    }

    if (!activeQuestIntervals.has(quest.id)) {
        return;
    }

    const initial = await reportPlayGameQuestProgress(quest, false, QuestifyLogger, { attempts: 3, delay: 2500 });

    const progressIntervalId = setInterval(async () => {
        const result = await reportPlayGameQuestProgress(quest, false, QuestifyLogger, { attempts: 3, delay: 2500 });

        if (result.progress === null) {
            clearInterval(progressIntervalId);
            activeQuestIntervals.delete(quest.id);
            QuestifyLogger.error(`[${getFormattedNow()}] Failed to send heartbeat for Quest ${questName}.`);
            return;
        }

        const isComplete = result.progress >= questTarget;
        const timeRemaining = questTarget - result.progress;
        const intervalData = activeQuestIntervals.get(quest.id);
        intervalData && (intervalData.progress = result.progress);

        if (isComplete) {
            clearInterval(progressIntervalId);
            clearTimeout(renderIntervalId);
            const success = await reportPlayGameQuestProgress(quest, true, QuestifyLogger, { attempts: 3, delay: 2500 });
            activeQuestIntervals.delete(quest.id);

            if (success) {
                QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} completed.`);

                if (settings.store.notifyOnQuestComplete) {
                    showNotification({
                        title: "Quest Completed!",
                        body: `The ${questName} Quest has completed.`,
                        dismissOnClick: true,
                        onClick: () => NavigationRouter.transitionTo(`${questPath}#${quest.id}`),
                    });
                }
            } else {
                QuestifyLogger.error(`[${getFormattedNow()}] Failed to complete Quest ${questName}.`);
            }
        } else if (timeRemaining < heartbeatInterval) {
            clearInterval(progressIntervalId);
            clearTimeout(renderIntervalId);

            setTimeout(async () => {
                const success = await reportPlayGameQuestProgress(quest, true, QuestifyLogger, { attempts: 3, delay: 2500 });
                activeQuestIntervals.delete(quest.id);

                if (success) {
                    QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} completed.`);

                    if (settings.store.notifyOnQuestComplete) {
                        showNotification({
                            title: "Quest Completed!",
                            body: `The ${questName} Quest has completed.`,
                            dismissOnClick: true,
                            onClick: () => NavigationRouter.transitionTo(`${questPath}#${quest.id}`),
                        });
                    }
                } else {
                    QuestifyLogger.error(`[${getFormattedNow()}] Failed to complete Quest ${questName}.`);
                }
            }, (timeRemaining + 1) * 1000);
        }
    }, heartbeatInterval * 1000);

    const renderIntervalId = setInterval(() => {
        const intervalData = activeQuestIntervals.get(quest.id);

        if (!!intervalData) {
            intervalData.progress += 1;
        } else {
            clearInterval(renderIntervalId);
        }

        rerenderQuests();
    }, 1000);

    const intervalData = activeQuestIntervals.get(quest.id);

    if (intervalData) {
        intervalData.progress = initial.progress || initialProgress;
        intervalData.progressTimeout = progressIntervalId;
        intervalData.rerenderTimeout = renderIntervalId;
    }
}

async function startAchievementActivityProgressTracking(quest: Quest, target: { raw: number; adjusted: number; }): Promise<void> {
    const questName = normalizeQuestName(quest.config.messages.questName);
    const questEnrolledAt = quest.userStatus?.enrolledAt ? new Date(quest.userStatus.enrolledAt) : null;
    const achievementType = quest.config.taskConfigV2?.tasks.ACHIEVEMENT_IN_ACTIVITY;
    activeQuestIntervals.set(quest.id, { progressTimeout: null as any, rerenderTimeout: null as any, progress: 0, type: "achievement" });

    QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} will be completed in the background.`);

    if (!questEnrolledAt) {
        const enrollmentTimeout = 60000;
        const enrolled = await waitUntilEnrolled(quest, enrollmentTimeout, 15, QuestifyLogger);
        quest = refreshQuest(quest);

        if (!enrolled) {
            QuestifyLogger.warn(`[${getFormattedNow()}] Quest ${questName} not enrolled within ${enrollmentTimeout / 1000} seconds.`);
            activeQuestIntervals.delete(quest.id);
            return;
        }
    }

    if (!activeQuestIntervals.has(quest.id)) {
        return;
    }

    const appID = achievementType?.applications?.[0].id;

    if (!appID) {
        QuestifyLogger.warn(`[${getFormattedNow()}] Could not find application ID for Quest ${questName}.`);
        activeQuestIntervals.delete(quest.id);
        return;
    }

    let authCode: string | null = null;

    try {
        const response = await RestAPI.post({
            url: `/oauth2/authorize?client_id=${appID}&response_type=code&scope=identify%20applications.entitlements&state=`,
            body: { authorize: true }
        });

        const location = response?.body?.location;

        if (location) {
            authCode = new URL(location).searchParams.get("code");
        }

        if (!authCode) {
            QuestifyLogger.warn(`[${getFormattedNow()}] Auth code not found for Quest ${questName}.`);
            activeQuestIntervals.delete(quest.id);
            return;
        }
    } catch (error) {
        QuestifyLogger.error(`[${getFormattedNow()}] Failed to retrieve auth code for Quest ${questName}:`, error);
        activeQuestIntervals.delete(quest.id);
        return;
    }

    const result = await QuestifyNative.complete(appID, authCode!, target.adjusted);
    activeQuestIntervals.delete(quest.id);

    if (!result.success) {
        const errorReason = result.error || "An error occurred while completing the Quest.";
        QuestifyLogger.error(`[${getFormattedNow()}] Failed to complete Quest ${questName}:`, errorReason);
        return;
    } else {
        QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} completed.`);

        if (settings.store.notifyOnQuestComplete) {
            showNotification({
                title: "Quest Completed!",
                body: `The ${questName} Quest has completed.`,
                dismissOnClick: true,
                onClick: () => NavigationRouter.transitionTo(`${questPath}#${quest.id}`),
            });
        }
    }
}

function canQuestAutoComplete(quest: Quest): boolean {
    const { completeVideoQuestsInBackground, completeGameQuestsInBackground, completeAchievementQuestsInBackground } = settings.store;

    const task = getQuestTask(quest);

    if (!task) { return false; }

    const questStatus = getQuestStatus(quest);
    const questCompleted = !!quest.userStatus?.completedAt;

    if (questStatus !== QuestStatus.Unclaimed || questCompleted) {
        return false;
    }

    const isWatch = task.type === QuestTaskType.WATCH_VIDEO || task.type === QuestTaskType.WATCH_VIDEO_ON_MOBILE;
    const isPlay = task.type === QuestTaskType.PLAY_ON_DESKTOP || task.type === QuestTaskType.PLAY_ON_XBOX || task.type === QuestTaskType.PLAY_ON_PLAYSTATION || task.type === QuestTaskType.PLAY_ACTIVITY;
    const isAchievement = task.type === QuestTaskType.ACHIEVEMENT_IN_ACTIVITY;

    const watchTypeCompatible = isWatch && completeVideoQuestsInBackground;
    const playTypeCompatible = isPlay && completeGameQuestsInBackground && IS_DISCORD_DESKTOP;
    const achievementTypeCompatible = isAchievement && completeAchievementQuestsInBackground && IS_DISCORD_DESKTOP;

    if (watchTypeCompatible || playTypeCompatible || achievementTypeCompatible) {
        return true;
    }

    return false;
}

function processQuestForAutoComplete(quest: Quest): boolean {
    const questName = normalizeQuestName(quest.config.messages.questName);

    const task = getQuestTask(quest);
    const questTarget = getQuestTarget(task);
    const existingInterval = activeQuestIntervals.get(quest.id);

    const isWatch = task?.type === QuestTaskType.WATCH_VIDEO || task?.type === QuestTaskType.WATCH_VIDEO_ON_MOBILE;
    const isPlay = task?.type === QuestTaskType.PLAY_ON_DESKTOP || task?.type === QuestTaskType.PLAY_ON_XBOX || task?.type === QuestTaskType.PLAY_ON_PLAYSTATION || task?.type === QuestTaskType.PLAY_ACTIVITY;
    const isAchievement = task?.type === QuestTaskType.ACHIEVEMENT_IN_ACTIVITY;
    const canAutoComplete = canQuestAutoComplete(quest);

    if (quest.userStatus?.completedAt || existingInterval) {
        return false;
    } else if (!task) {
        QuestifyLogger.warn(`[${getFormattedNow()}] Could not recognize the Quest type for ${questName}.`);
        return false;
    } else if (!canAutoComplete) {
        return false;
    } else if (isWatch) {
        startVideoProgressTracking(quest, questTarget);
        return true;
    } else if (isPlay) {
        startPlayGameProgressTracking(quest, questTarget);
        return true;
    } else if (isAchievement) {
        startAchievementActivityProgressTracking(quest, questTarget);
        return true;
    }

    return false;
}

function shouldDisableQuestAcceptedButton(quest: Quest): boolean | null {
    const { completeGameQuestsInBackground } = settings.store;

    if (activeQuestIntervals.has(quest.id)) {
        return true;
    } else if (completeGameQuestsInBackground) {
        if (IS_DISCORD_DESKTOP) {
            return false;
        }
    }

    return null;
}

function getQuestUnacceptedButtonText(quest: Quest): string | null {
    const { completeGameQuestsInBackground, completeVideoQuestsInBackground, completeAchievementQuestsInBackground } = settings.store;

    const task = getQuestTask(quest);
    const { adjusted: target } = getQuestTarget(task);
    const targetFormatted = `${String(Math.floor(target / 60)).padStart(2, "0")}:${String(target % 60).padStart(2, "0")}`;

    const isWatch = task?.type === QuestTaskType.WATCH_VIDEO || task?.type === QuestTaskType.WATCH_VIDEO_ON_MOBILE;
    const isPlay = task?.type === QuestTaskType.PLAY_ON_DESKTOP || task?.type === QuestTaskType.PLAY_ON_XBOX || task?.type === QuestTaskType.PLAY_ON_PLAYSTATION || task?.type === QuestTaskType.PLAY_ACTIVITY;
    const isAchievement = task?.type === QuestTaskType.ACHIEVEMENT_IN_ACTIVITY;

    if (target > 0) {
        if ((isPlay && completeGameQuestsInBackground && IS_DISCORD_DESKTOP) || (isWatch && completeVideoQuestsInBackground)) {
            return `Complete (${targetFormatted})`;
        } else if (isAchievement && completeAchievementQuestsInBackground) {
            return "Complete (Immediate)";
        }
    }

    return null;
}

function getQuestAcceptedButtonText(quest: Quest, prepositional: boolean = false): string | null {
    const { completeGameQuestsInBackground, completeVideoQuestsInBackground, completeAchievementQuestsInBackground } = settings.store;
    const questEnrolledAt = quest.userStatus?.enrolledAt ? new Date(quest.userStatus.enrolledAt) : null;
    const task = getQuestTask(quest);
    const intervalData = activeQuestIntervals.get(quest.id);

    const isWatch = task?.type === QuestTaskType.WATCH_VIDEO || task?.type === QuestTaskType.WATCH_VIDEO_ON_MOBILE;
    const isPlay = task?.type === QuestTaskType.PLAY_ON_DESKTOP || task?.type === QuestTaskType.PLAY_ON_XBOX || task?.type === QuestTaskType.PLAY_ON_PLAYSTATION || task?.type === QuestTaskType.PLAY_ACTIVITY;
    const isAchievement = task?.type === QuestTaskType.ACHIEVEMENT_IN_ACTIVITY;

    if (questEnrolledAt) {
        if (((isPlay && completeGameQuestsInBackground && IS_DISCORD_DESKTOP) || (isWatch && completeVideoQuestsInBackground))) {
            const { adjusted: durationWithLeeway } = getQuestTarget(task);
            const currentProgress = getQuestProgress(quest, task) || 0;
            const progress = Math.min(currentProgress, durationWithLeeway);
            const timeRemaining = Math.max(0, durationWithLeeway - progress);
            const canCompleteImmediately = isWatch && questEnrolledAt && ((new Date().getTime() - questEnrolledAt.getTime()) / 1000) >= durationWithLeeway;
            const progressFormatted = `${String(Math.floor(timeRemaining / 60)).padStart(2, "0")}:${String(timeRemaining % 60).padStart(2, "0")}`;
            const progressFormattedAsPreposition = timeRemaining >= 60
                ? `${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s`
                : `${timeRemaining % 60}s`;

            if (!!intervalData) {
                return canCompleteImmediately || !timeRemaining
                    ? "Completing..."
                    : `Completing ${prepositional ? `in ${progressFormattedAsPreposition}` : `(${progressFormatted})`}`;
            } else if (isWatch || isPlay) {
                return canCompleteImmediately ? "Complete (Immediate)" : timeRemaining === durationWithLeeway ? `Complete (${progressFormatted})` : `Resume (${progressFormatted})`;
            }
        } else if (isAchievement && completeAchievementQuestsInBackground) {
            if (!!intervalData) {
                return "Completing...";
            } else {
                return "Complete (Immediate)";
            }
        }
    }

    return null;
}

function getQuestPanelPercentComplete({ quest, percentCompleteText }: { quest: Quest; percentCompleteText?: string; }): { percentComplete: number; } | { percentComplete: number; percentCompleteText: string; } | null {
    if (!quest) { return null; }

    const task = getQuestTask(quest);

    if (!task) { return null; }

    const { adjusted: questTarget } = getQuestTarget(task);
    const questProgress = getQuestProgress(quest, task);

    if (!questTarget || questProgress === null) { return null; }

    const decimal = Math.min(1, questProgress / questTarget);

    return percentCompleteText ? {
        percentComplete: decimal,
        percentCompleteText: `${Math.floor(decimal * 100)}%`
    } : {
        percentComplete: decimal
    };
}

function getQuestPanelSubtitleText(quest: Quest): string | null {
    const questStatus = getQuestStatus(quest);
    const questCompleted = !!quest.userStatus?.completedAt && questStatus === QuestStatus.Unclaimed;
    const intervalData = activeQuestIntervals.get(quest.id);
    const rewardItem = quest.config.rewardsConfig.rewards[0] || null;
    const completingText = getQuestAcceptedButtonText(quest, true) || "Completing";
    const completedText = questCompleted ? "Completed" : null;

    if (!intervalData && !completedText) {
        return null;
    }

    if (rewardItem?.orbQuantity) {
        return `${completedText || completingText} for ${rewardItem.orbQuantity} Orbs.`;
    } else if (rewardItem?.messages?.nameWithArticle) {
        return `${completedText || completingText} for ${rewardItem.messages.nameWithArticle}.`;
    } else {
        return `${completedText || completingText} for an unrecognized reward.`;
    }
}

function getQuestPanelTitleText(quest: Quest): string | null {
    return normalizeQuestName(quest.config.messages.questName);
}

function getQuestPanelOverride(): Quest | null {
    settings.use(["triggerQuestsRerender"]);
    let closestQuest: Quest | null = null;
    let closestTimeRemaining = Infinity;

    activeQuestIntervals.forEach((interval, questId) => {
        const quest = QuestsStore.getQuest(questId);

        if (!quest) {
            return;
        }

        const task = getQuestTask(quest);
        const { adjusted: duration } = getQuestTarget(task);

        if (!duration) {
            return;
        }

        const timeRemaining = duration - interval.progress;

        // 3 second buffer to account for per-second rerendering
        // which could cause flickering if multiple Quests were
        // started at the same time.
        if (timeRemaining < (closestTimeRemaining - 3)) {
            closestTimeRemaining = timeRemaining;
            closestQuest = quest;
        }
    });

    if (!closestQuest) {
        const completedUnclaimedQuests = (Array.from(QuestsStore.quests.values()) as Quest[])
            .filter(q => q.userStatus?.completedAt && getQuestStatus(q) === QuestStatus.Unclaimed)
            .sort((a, b) => {
                const aTime = new Date(a.userStatus?.completedAt as string).getTime();
                const bTime = new Date(b.userStatus?.completedAt as string).getTime();
                return bTime - aTime;
            });

        closestQuest = completedUnclaimedQuests[0] ?? null;
    }

    return closestQuest;
}

function disguiseHomeButton(location: string): boolean {
    const { questButtonDisplay, unclaimedUnignoredQuests, onQuestsPage } = settings.use(["questButtonDisplay", "unclaimedUnignoredQuests", "onQuestsPage"]);

    if (!showQuestsButton(questButtonDisplay, unclaimedUnignoredQuests, onQuestsPage)) {
        return false;
    }

    return location === questPath;
}

function useQuestRerender(): number {
    settings.use(["triggerQuestsRerender"]);
    const [renderTrigger, setRenderTrigger] = useState(0);
    useEffect(() => addRerenderCallback(() => setRenderTrigger(prev => prev + 1)), []);
    return renderTrigger;
}

function getLastSortChoice(): string | null {
    const { rememberQuestPageSort, lastQuestPageSort } = settings.store;
    return rememberQuestPageSort ? lastQuestPageSort : "questify";
}

function getLastFilterChoices(): { group: string; filter: string; }[] | null {
    const { rememberQuestPageFilters, lastQuestPageFilters } = settings.store;
    return rememberQuestPageFilters ? Object.values(lastQuestPageFilters).map(item => JSON.parse(JSON.stringify(item))) : null;
}

function setLastSortChoice(sort: string): void {
    settings.store.lastQuestPageSort = sort;
}

function setLastFilterChoices(filters: { group: string; filter: string; }[]): void {
    if (!filters || !Object.keys(filters).length || !Object.values(filters).every(f => f.group && f.filter)) { return; }
    settings.store.lastQuestPageFilters = JSON.parse(JSON.stringify(filters)).reduce((acc, item) => ({ ...acc, [item.filter]: item }), {});
}

function getQuestAcceptedButtonProps(quest: Quest, text: string, disabled: boolean, onClick?: () => void) {
    const validTasks = [
        QuestTaskType.WATCH_VIDEO,
        QuestTaskType.WATCH_VIDEO_ON_MOBILE,
        QuestTaskType.PLAY_ON_DESKTOP,
        QuestTaskType.PLAY_ON_XBOX,
        QuestTaskType.PLAY_ON_PLAYSTATION,
        QuestTaskType.PLAY_ACTIVITY,
        QuestTaskType.ACHIEVEMENT_IN_ACTIVITY
    ];

    const validTask = Array.from(validTasks).some(taskType => Object.values(quest.config.taskConfigV2?.tasks || {}).some(
        task => task.type === taskType && (task.type !== QuestTaskType.WATCH_VIDEO_ON_MOBILE || settings.store.makeMobileQuestsDesktopCompatible)
    ));

    if (!validTask) {
        return {
            disabled: disabled,
            text: text,
            onClick: onClick,
            icon: () => { }
        };
    }

    return {
        disabled: shouldDisableQuestAcceptedButton(quest) ?? disabled,
        text: getQuestAcceptedButtonText(quest) ?? text,
        onClick: () => { const startingAutocomplete = processQuestForAutoComplete(quest); !startingAutocomplete && onClick ? onClick() : null; },
        icon: () => { }
    };
}

// Drop support for QuestCompleter and migrate to Questify settings.
migratePluginToSettings(true, "Questify", "QuestCompleter", "completeVideoQuestsInBackground", "completeGameQuestsInBackground", "completeAchievementQuestsInBackground");

export default definePlugin({
    name: "Questify",
    description: "Enhance your Quest experience with a suite of features, or disable them entirely if they're not your thing.",
    authors: [EquicordDevs.Etorix],
    dependencies: ["AudioPlayerAPI", "ServerListAPI"],
    startAt: StartAt.Init, // Needed in order to beat Read All Messages to inserting above the server list.
    settings,

    sortQuests,
    formatLowerBadge,
    getQuestTileStyle,
    getQuestTileClasses,
    makeDesktopCompatible,
    shouldHideQuestPopup,
    shouldHideDiscoveryTab,
    shouldPreloadQuestAssets,
    shouldHideDirectMessagesTab,
    shouldPreventFetchingQuests,
    shouldHideBadgeOnUserProfiles,
    shouldHideSponsoredQuestBanner,
    shouldHideGiftInventoryRelocationNotice,
    shouldHideFriendsListActiveNowPromotion,
    shouldHideMembersListActivelyPlayingIcon,
    getQuestUnacceptedButtonText,
    getQuestPanelPercentComplete,
    processQuestForAutoComplete,
    getQuestAcceptedButtonProps,
    getQuestAcceptedButtonText,
    getQuestPanelSubtitleText,
    getQuestPanelTitleText,
    getQuestPanelOverride,
    setLastFilterChoices,
    getLastFilterChoices,
    activeQuestIntervals,
    disguiseHomeButton,
    getLastSortChoice,
    setLastSortChoice,
    useQuestRerender,

    patches: [
        {
            // Hides the notice in the gift inventory that Quests have been relocated to the Discovery tab.
            find: "quests-wumpus-hikes-mountain-transparent-background",
            replacement: {
                match: /return(?=\(0,\i.\i\)\("div",{className:)/,
                replace: "return $self.shouldHideGiftInventoryRelocationNotice()?null:"
            }
        },
        {
            // Hides Quests tab in the Discovery page.
            find: "GLOBAL_DISCOVERY_SIDEBAR},",
            replacement: [
                {
                    match: /(GLOBAL_DISCOVERY_TABS).map/,
                    replace: '$1.filter(tab=>!(tab==="quests"&&$self.shouldHideDiscoveryTab())).map'
                }
            ]
        },
        {
            // Hides Quests tab in the DMs tab list.
            find: ".QUEST_HOME):",
            replacement: [
                {
                    match: /(?<="family-center"\):null,)/,
                    replace: "$self.shouldHideDirectMessagesTab()||"
                }
            ]
        },
        {
            // Hides the sponsored banner on the Quests page.
            find: "{isInDiscoverQuestHomeTab:",
            group: true,
            replacement: [
                {
                    match: /(?<=resetSortingFiltering\(\)},\[\]\);)/,
                    replace: "const shouldHideSponsoredQuestBanner=$self.shouldHideSponsoredQuestBanner();"
                },
                {
                    match: /(?<=if\(null!=\i\))return(.{0,60}?}\))/,
                    replace: "if(!shouldHideSponsoredQuestBanner)return $1"
                }
            ]
        },
        {
            // Hides the Quest icon from members list items when
            // a user is playing a game tied to an active Quest.
            find: '"ActivityStatus")',
            group: true,
            replacement: [
                {
                    match: /(?<=\i\)&&"xs"===\i;)/,
                    replace: "const shouldHideMembersListActivelyPlayingIcon=$self.shouldHideMembersListActivelyPlayingIcon();"
                },
                {
                    match: /(?<=\i\(\),\i&&)/,
                    replace: "!shouldHideMembersListActivelyPlayingIcon&&"
                }
            ]
        },
        {
            // Hides the Quest badge on user profiles.
            find: ".MODAL]:26",
            group: true,
            replacement: [
                {
                    match: /(return 0===\i.length\?null:\(0,)/,
                    replace: "const shouldHideBadgeOnUserProfiles=$self.shouldHideBadgeOnUserProfiles();$1"
                },
                {
                    match: /(badges:\i)/,
                    replace: '$1.filter(badge=>!(["quest_completed","orb_profile_badge"].includes(badge.id)&&shouldHideBadgeOnUserProfiles))',
                }
            ]
        },
        {
            // Hides the new Quest popup above the account panel.
            // Allows in-progress Quests to still show.
            find: "QUESTS_BAR,questId",
            replacement: {
                match: /(?=if\(null==(\i)\)return null;)(.{0,125}?quest:\i}\);return)/,
                replace: "const hidePopup=$self.shouldHideQuestPopup($1);$2!hidePopup&&"
            }
        },
        {
            // Fixes the progress tracking for auto-completing Quests.
            find: ",{progressTextAnimation:",
            replacement: {
                match: /(let{percentComplete:.{0,115}?children:\i}=)(\i)/,
                replace: "const questifyProgress=$self.getQuestPanelPercentComplete({...$2,quest:$2.children?.props?.quest});$1Object.assign({},$2,questifyProgress??{})"
            }
        },
        {
            // Overrides the title and subtitle to provide more
            // useful information for Quests being auto-completed.
            find: '"progress-title"',
            replacement: {
                match: /(?<={quest:(\i).{0,250}?return.{0,150}?,percentComplete:\i.{0,280}?"progress-title",children.{0,115}?children:)(\i.{0,50}"progress-subtitle",isTextTransition:!0,children.{0,115}?children:)/,
                replace: "$self.getQuestPanelTitleText($1)??$2$self.getQuestPanelSubtitleText($1)??"
            }
        },
        {
            // Replaces the default displayed Quest with the soonest to
            // be completed Quest which is actively being auto-completed.
            find: '"useQuestBarQuest"})',
            replacement: {
                match: /(?<=null\);return )(\i\?\i:\i)/,
                replace: "$self.getQuestPanelOverride()??($1)"
            }
        },
        {
            // Hides the Friends List "Active Now" promotion.
            find: "`application-stream-",
            group: true,
            replacement: [
                {
                    match: /(let{party)/,
                    replace: "const shouldHideFriendsListActiveNowPromotion=$self.shouldHideFriendsListActiveNowPromotion();$1"
                },
                {
                    match: /(null!=(\i)&&null!=\i&&)/,
                    replace: "!shouldHideFriendsListActiveNowPromotion&&$1"
                }
            ]
        },
        {
            // Prevents fetching Quests.
            find: 'type:"QUESTS_FETCH_CURRENT_QUESTS_BEGIN"',
            group: true,
            replacement: [
                {
                    // QUESTS_FETCH_CURRENT_QUESTS_BEGIN
                    match: /(if\(!\i.\i.isFetchingCurrentQuests\))/,
                    replace: "if($self.shouldPreventFetchingQuests())return;$1"
                },
                {
                    // QUESTS_FETCH_QUEST_TO_DELIVER_BEGIN
                    match: /(?=let.{0,150}QUESTS_FETCH_QUEST_TO_DELIVER_BEGIN)/,
                    replace: "if($self.shouldPreventFetchingQuests())return;"
                }
            ]
        },
        {
            // MARK: TODO 1
            //  - Cleanup once Discord rolls out the new mana select completely.
            //  - Also see anywhere DynamicDropdown is used for refactoring.
            //
            // Various patches to the SearchableSelect component.
            find: ".popoutLayerContext,renderPopout:",
            group: true,
            replacement: [
                {
                    // Extracts a custom feedback prop before the variable is overwritten.
                    match: /(?<=forwardRef\(function\((\i),\i\){)/,
                    replace: "const vcDynamicDropdownFeedback=$1.feedback;"
                },
                {
                    // Passes the custom prop to the dropdown's invalid handler.
                    match: /((\i);return\(0,\i.\i\)\(\i,{)(loading:\i,)/,
                    replace: "$1feedback:vcDynamicDropdownFeedback,$3"
                },
                {
                    // Makes use of the custom prop if provided, otherwise assume default behavior.
                    match: /(\i.intl.string\(\i.\i#{intl::NO_RESULTS_FOUND}\))/,
                    replace: "arguments[0]?.feedback??$1"
                },
                {
                    // Prevent SearchableSelect from force-scrolling into view, causing the dropdown to close.
                    match: /(?<=\.scrollIntoView\()/,
                    replace: "{block:\"nearest\",inline:\"nearest\"}"
                },
                {
                    // Passes a popoutClassName and optionClassName to the popout handler.
                    match: /(?<=renderOptionPrefix:\i,renderOptionSuffix:\i)/,
                    replace: ",popoutClassName:arguments[0]?.popoutClassName,optionClassName:arguments[0]?.optionClassName"
                },
                {
                    // Makes use of the custom popoutClassName prop if provided.
                    match: /"aria-busy":!0,className:\i\(\)\(/,
                    replace: "$&arguments[0]?.popoutClassName,"
                },
                {
                    // Passes the custom optionClassName prop to the row renderer.
                    match: /(?<="aria-posinset":\i,"aria-setsize":\i.length,)/,
                    replace: "optionClassName:arguments[0]?.optionClassName,"
                },
                {
                    // Makes use of the custom optionClassName prop if provided.
                    match: /(?<=focusProps:{enabled:!1},className:\i\(\)\()/,
                    replace: "arguments[0]?.optionClassName,"
                },
                {
                    // Pass the unused props to the new mana select being
                    // used by dev://experiment/2025-09-mana-desktop-select
                    match: /(?<=closeOnSelect:\i)(?=})/,
                    replace: ",...arguments[0]"
                }
            ]
        },
        {
            // Formats the Orbs balance on the Quests page with locale string formatting.
            find: '("BalanceCounter")',
            replacement: [
                {
                    match: /(`\${(\i).toFixed\(0\)}`.length)/,
                    replace: "$1+($2>=1e6?0.8:$2>=1e3?0.4:0)"
                },
                {
                    match: /(?<=children:\i.to\(\i=>`\${\i)(.toFixed\(0\))/,
                    replace: ".toLocaleString(undefined,{maximumFractionDigits:0})"
                }
            ]
        },
        {
            // Adds a maxDigits prop to the LowerBadge component which allows for not truncating, or for truncating at a specific threshold.
            find: ".INTERACTIVE_TEXT_ACTIVE.css,shape",
            group: true,
            replacement: [
                {
                    // Extracts the custom maxDigits prop.
                    match: /(=>{let{count:\i,)/,
                    replace: "$1maxDigits,"
                },
                {
                    // Passes maxDigits to the rounding function.
                    match: /(children:\i\(\i)/,
                    replace: "$1,maxDigits"
                },
                {
                    // Makes use of the custom prop if provided by using custom logic for negatives and truncation.
                    // If the prop is not provided, assume default behavior for native badges or other plugins not
                    // utilizing the custom prop.
                    match: /(?<=function \i\((\i))(\){return )(\i<1e3.{0,60}?k\+`)/,
                    replace: ",maxDigits$2maxDigits===undefined?($3):$self.formatLowerBadge($1,maxDigits)[0]"
                }
            ]
        },
        {
            find: "id:`quest-tile-",
            group: true,
            replacement: [
                {
                    // Restyles Quest tiles with colors.
                    match: /(?<=\i.current=\i},className:)(\i\(\)\(\i.\i,\i\)),/,
                    replace: "$self.getQuestTileClasses($1,arguments[0].quest),style:$self.getQuestTileStyle(arguments[0].quest),"
                },
                {
                    // Encourages banners to load quicker if the setting is enabled.
                    match: /(warningHints:\i,)isVisibleInViewport:(\i)/,
                    replace: "$1isVisibleInViewport:$self.shouldPreloadQuestAssets()?true:$2"
                },
                {
                    // Encourages reward icons to load quicker if the setting is enabled.
                    match: /(onReceiveErrorHints:\i,)isVisibleInViewport:(\i)/,
                    replace: "$1isVisibleInViewport:$self.shouldPreloadQuestAssets()?true:$2"
                },
            ]
        },
        {
            // Sorts the "Claimed Quests" tabs.
            find: ".ALL)}):(",
            group: true,
            replacement: [
                {
                    match: /(claimedQuests:(\i).{0,50}?;)/,
                    replace: "$1$2=$self.sortQuests($2);"
                },
            ]
        },
        {
            // Adds the "Questify" sort option to the sort enum.
            find: "SUGGESTED=\"suggested\",",
            replacement: {
                match: /return ((\i).SUGGESTED="suggested",)/,
                replace: "return $2.QUESTIFY=\"questify\",$1"
            }
        },
        {
            // Adds the "Questify" sort option to the sort dropdown.
            find: "has no rewards configured`",
            replacement: {
                match: /(?=case (\i.\i).SUGGESTED)/,
                replace: "case $1.QUESTIFY:return \"Questify\";"
            },
        },
        {
            find: "CLAIMED=\"claimed\",",
            group: true,
            replacement: [
                {
                    // Run Questify's sort function every time due to hook requirements but return
                    // early if not applicable. If the sort method is set to "Questify", replace the
                    // Quests with the sorted ones. Also, setup a trigger to rerender the memo.
                    match: /(return \i.useMemo\(\(\)=>{)(?=if\(0===(\i).length\))/,
                    replace: "const questRerenderTrigger=$self.useQuestRerender();const questifySorted=$self.sortQuests($2,arguments[1].sortMethod!==\"questify\");$1if(arguments[1].sortMethod===\"questify\"){$2=questifySorted;};"
                },
                {
                    // Account for Quest status changes.
                    match: /return (\i).current;/,
                    replace: "null;"
                },
                {
                    // If we already applied Questify's sort, skip further sorting.
                    match: /(?<=sortMethod:(\i).{0,115}?return )((\i).sort)/,
                    replace: "$1===\"questify\"?$3:$2"
                },
                {
                    // Add the trigger to the memo for rerendering Quests order due to progress changes, etc.
                    match: /(?<=id\);.{0,100}?,\i},\[\i,\i)/,
                    replace: ",questRerenderTrigger,questifySorted"
                }
            ]
        },
        {
            // Loads the last used sort method and filter choices.
            // Defaults to sorting by "Questify" and no filters.
            find: "({resetSortingFiltering:()",
            group: true,
            replacement: [
                {
                    // Set the initial sort method.
                    match: /(\i.\i.SUGGESTED)/,
                    replace: "$self.getLastSortChoice()??$1"
                },
                {
                    // Set the initial filters.
                    match: /(get\(\i\)\)\?\?)(\i)/,
                    replace: "$1$self.getLastFilterChoices()??$2"
                },
                {
                    // Update the last used sort method when it changes.
                    match: /(onChange:)(\i)(.{0,40}?selectedSortMethod)/,
                    replace: "$1(value)=>{$self.settings.store.lastQuestPageSort=value;$2(value);}$3"
                },
                {
                    // Update the last used filter choices when they change.
                    match: /(onChange:)(\i)(.{0,40}?selectedFilters)/,
                    replace: "$1(value)=>{$self.settings.store.lastQuestPageFilters=value.reduce((acc,item)=>({...acc,[item.filter]:item}),{});$2(value);}$3"
                },
                {
                    // Update the last used sort and filter choices when the toggle setting for either is changed.
                    match: /(?<=ALL,\i.useMemo\(\(\)=>\()({sortMethod:(\i),filters:(\i))/,
                    replace: "$self.setLastSortChoice($2),$self.setLastFilterChoices($3),$1"
                }
            ]
        },
        {
            // Whether preloading assets is enabled or not, the placeholders loading
            // before the assets causes a lot of element shifting, whereas if
            // the elements load immediately instead, it doesn't.
            find: ",{rewardWithArticleHook:()",
            replacement: {
                match: /showPlaceholder:!\i/,
                replace: "showPlaceholder:false"
            }
        },
        // MARK: TODO 2 START
        //  - Cleanup once Discord rolls out the new quest CTA refactor completely.
        {
            // Sets intervals to progress Play Game Quests in the background and patches some common click handlers.
            find: "IN_PROGRESS:if(",
            group: true,
            replacement: [
                {
                    // Resume Video Quest.
                    match: /(tooltipText:\i.intl.string\(\i.\i.\i\),onClick:\(\)=>)(\(0,\i.\i\)\({quest)/,
                    replace: "$1!$self.processQuestForAutoComplete(arguments[0].quest)&&$2"
                },
                {
                    // Start Play Game and Play Activity Quests.
                    // Video Quests are handled in the next patch group.
                    // Also set the unaccepted button text to "Complete".
                    match: /(\i,tooltipText:null,onClick:async\(\)=>{)/,
                    replace: "$self.getQuestUnacceptedButtonText(arguments[0].quest)??$1const startingAutoComplete=arguments[0].isVideoQuest?false:$self.processQuestForAutoComplete(arguments[0].quest);"
                },
                {
                    // Set the accepted button text to "Complete", "Completing", or "Resume" based on progress.
                    match: /(if\(\i\)return{text:)/,
                    replace: "$1$self.getQuestAcceptedButtonText(arguments[0].quest)??",
                },
                {
                    // Setup a trigger to rerender the memo.
                    match: /(?=return \i.useMemo)/,
                    replace: "const questRerenderTrigger=$self.useQuestRerender();"
                },
                {
                    // Add the trigger to the memo for rerendering the progress label.
                    match: /(\i\.intl\.string\(\i\.\i#{intl::QUESTS_SEE_CODE}\)\}\)\}\},\[|\)\}\}\},\[)/,
                    replace: "$1questRerenderTrigger,"
                },
                {
                    // Stop Play Activity Quests from launching the activity on first click.
                    match: /(?<=,)(\i\(\))(\)}};)/,
                    replace: "!startingAutoComplete&&$1$2"
                }
            ]
        },
        {
            // Adds support for dev://experiment/2025-12-quest-cta-refactor-rollout
            find: '"primary",preClickCallback:',
            replacement: [
                {
                    match: /(?=let{quest:)/,
                    replace: "const questifyText=$self.getQuestUnacceptedButtonText(arguments[0].quest);"
                },
                {
                    match: /(?<=}\),)(\i\?\.\(\))/,
                    replace: "!$self.processQuestForAutoComplete(arguments[0].quest)&&($1)"
                },
                {
                    match: /(?<=,text:)(\i),icon:\i/,
                    replace: "questifyText??$1"
                }
            ]
        },
        {
            // Sets intervals to progress Video Quests in the background.
            find: "CAPTCHA_FAILED:",
            replacement: {
                match: /(?<=SUCCESS:)(\i\({)/,
                replace: "!$self.processQuestForAutoComplete(arguments[0])&&$1"
            }
        },
        {
            // Sets intervals to progress Play Game Quests in the background.
            // Triggers if a Quest has already been started but was interrupted, such as by a reload.
            find: "WATCH_VIDEO,skipEnrollmentCheck:!0})",
            group: true,
            replacement: [
                {
                    // Initial and subsequent select drop down for picking or changing a platform.
                    match: /(select:)(\i)(,serialize:\i=>{)/g,
                    replace: "$1(platform)=>{$self.processQuestForAutoComplete(arguments[0].quest),$2(platform)}$3"
                },
                {
                    // The Quest Accepted button is disabled by default. If the user reloads the client, they need a way
                    // to resume the automatic completion, so patch in optionally enabling it if the feature is enabled.
                    // The "Quest Accepted" text is changed to "Resume" if the Quest is in progress but not active.
                    // Then, when the Quest Accepted button is clicked, resume the automatic completion of the
                    // Quest and disable the button again.
                    match: /(?<=secondary",)disabled:(!0),text:(\i\.intl\.string\(\i\.\i#{intl::QUEST_ACCEPTED}\)),/,
                    replace: "...$self.getQuestAcceptedButtonProps(arguments[0].quest,$2,$1,undefined),"
                },
                {
                    // Does the above for resuming Play Activity Quests.
                    match: /(?<=icon:.{0,35}?onClick:(.{0,20}?),text:(\i),fullWidth:!0)/,
                    replace: ",...$self.getQuestAcceptedButtonProps(arguments[0].quest,$2,false,$1)"
                }
            ]
        },
        // MARK: TODO 2 END
        {
            // Prevents the new Quests location from counting as part of the
            // DM button highlight logic while the Quest button is visible.
            find: "GLOBAL_DISCOVERY),",
            replacement: {
                match: /(pathname:(\i)}.{0,400}?return )/,
                replace: "$1$self.disguiseHomeButton($2)?false:"
            }
        }
    ],

    contextMenus: {
        "quests-entry": QuestTileContextMenu
    },

    flux: {
        CHANNEL_SELECT(data) {
            settings.store.onQuestsPage = (window.location.pathname === questPath);
        },

        QUESTS_FETCH_CURRENT_QUESTS_SUCCESS(data) {
            initialQuestDataFetched = true;
            const source = data.source ? ` [${data.source}]` : "";
            QuestifyLogger.info(`[${getFormattedNow()}] [QUESTS_FETCH_CURRENT_QUESTS_SUCCESS]${source}\n`, data);
            validateAndOverwriteIgnoredQuests(undefined, data.quests);
        },

        QUESTS_ENROLL_SUCCESS(data) {
            QuestifyLogger.info(`[${getFormattedNow()}] [QUESTS_ENROLL_SUCCESS]\n`, data);
            fetchAndDispatchQuests("Questify", QuestifyLogger);
            validateAndOverwriteIgnoredQuests();
        },

        QUESTS_CLAIM_REWARD_SUCCESS(data) {
            QuestifyLogger.info(`[${getFormattedNow()}] [QUESTS_CLAIM_REWARD_SUCCESS]\n`, data);
            fetchAndDispatchQuests("Questify", QuestifyLogger);
            validateAndOverwriteIgnoredQuests();
        },

        QUESTS_USER_STATUS_UPDATE(data) {
            QuestifyLogger.info(`[${getFormattedNow()}] [QUESTS_USER_STATUS_UPDATE]\n`, data);
            validateAndOverwriteIgnoredQuests();
        },

        // Stops any Game Quest background completion intervals for running games to prevent duplicate heartbeats.
        // This will also update the button text back to "Quest Accepted" from "Resume" if the Quest is in progress.
        RUNNING_GAMES_CHANGE(data) {
            const gameIDs: string[] = data.games.map(game => game.id);
            let shouldRerenderQuests = false;

            (Array.from(QuestsStore.quests.values()) as Quest[]).forEach(quest => {
                const questName = normalizeQuestName(quest.config.messages.questName);
                const questAppID = quest.config.application.id;

                if (gameIDs.includes(questAppID) && activeQuestIntervals.has(quest.id)) {
                    const intervalData = activeQuestIntervals.get(quest.id);
                    clearInterval(intervalData?.progressTimeout);
                    clearTimeout(intervalData?.rerenderTimeout);
                    activeQuestIntervals.delete(quest.id);
                    QuestifyLogger.info(`[${getFormattedNow()}] Application for Quest ${questName} that was being completed in the background has been launched. Stopping background completion to prevent duplicate heartbeats.`);
                    shouldRerenderQuests = true;
                }
            });

            if (shouldRerenderQuests) {
                rerenderQuests();
            }
        },

        LOGOUT(data) {
            settings.store.unclaimedUnignoredQuests = 0;
            settings.store.onQuestsPage = false;
        },

        LOGIN_SUCCESS(data) {
            onceReady.then(() => {
                fetchAndDispatchQuests("Questify", QuestifyLogger);
            });
        }
    },

    renderQuestifyButton: ErrorBoundary.wrap(QuestButton, { noop: true }),

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderQuestifyButton);
        const interval = settings.store.fetchingQuestsInterval;
        const intervalValid = interval >= minimumAutoFetchIntervalValue && interval <= maximumAutoFetchIntervalValue;

        if (!!intervalValid && autoFetchCompatible()) {
            startAutoFetchingQuests();
        }

        const wasReload = window?.navigation?.activation?.navigationType === "reload";
        const maybeResumable = !(settings.store.disableQuestsEverything || settings.store.disableQuestsFetchingQuests);

        if (!wasReload || !maybeResumable) {
            settings.store.resumeQuestIDs = settings.def.resumeQuestIDs.default;
            return;
        }

        onceReady.then(() => {
            const interval = setInterval(() => {
                if (initialQuestDataFetched) {
                    clearInterval(interval);

                    const playResume = settings.store.resumeQuestIDs.play.map(id => QuestsStore.getQuest(id)).filter(Boolean);
                    const watchResume = settings.store.resumeQuestIDs.watch.map(id => QuestsStore.getQuest(id)).filter(Boolean);
                    const achievementResume = settings.store.resumeQuestIDs.achievement.map(id => QuestsStore.getQuest(id)).filter(Boolean);

                    settings.store.resumeQuestIDs.play = playResume.map(quest => quest!.id);
                    settings.store.resumeQuestIDs.watch = watchResume.map(quest => quest!.id);
                    settings.store.resumeQuestIDs.achievement = achievementResume.map(quest => quest!.id);

                    if (!playResume.length && !watchResume.length && !achievementResume.length) {
                        return;
                    }

                    QuestifyLogger.info(`[${getFormattedNow()}] Resuming background completion for Quests:`, {
                        play: playResume.map(q => q.config.messages.questName),
                        watch: watchResume.map(q => q.config.messages.questName),
                        achievement: achievementResume.map(q => q.config.messages.questName)
                    });

                    [...playResume, ...watchResume, ...achievementResume].forEach(quest => quest && processQuestForAutoComplete(quest));
                }
            }, 100);
        });
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderQuestifyButton);
        stopAutoFetchingQuests();

        if (!Settings.plugins.Questify.enabled) {
            settings.store.resumeQuestIDs = settings.def.resumeQuestIDs.default;
        }

        activeQuestIntervals.forEach((intervalData, questId) => {
            clearInterval(intervalData.progressTimeout);
            clearTimeout(intervalData.rerenderTimeout);
            activeQuestIntervals.delete(questId);
        });
    }
});
