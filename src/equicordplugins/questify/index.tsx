/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { ErrorBoundary, openPluginModal } from "@components/index";
import { EquicordDevs } from "@utils/constants";
import { getIntlMessage } from "@utils/index";
import definePlugin, { StartAt } from "@utils/types";
import { ContextMenuApi, Menu, NavigationRouter } from "@webpack/common";
import { JSX } from "react";

import { addIgnoredQuest, autoFetchCompatible, fetchAndAlertQuests, maximumAutoFetchIntervalValue, minimumAutoFetchIntervalValue, questIsIgnored, removeIgnoredQuest, rerenderQuests, settings, startAutoFetchingQuests, stopAutoFetchingQuests, validateAndOverwriteIgnoredQuests } from "./settings";
import { ExcludedQuestMap, GuildlessServerListItem, Quest, QuestIcon, QuestMap, QuestStatus, RGB } from "./utils/components";
import { adjustRGB, decimalToRGB, fetchAndDispatchQuests, formatLowerBadge, getFormattedNow, getIgnoredQuestIDs, getQuestStatus, isDarkish, leftClick, middleClick, normalizeQuestName, q, QuestifyLogger, questPath, QuestsStore, refreshQuest, reportPlayGameQuestProgress, reportVideoQuestProgress, rightClick, setIgnoredQuestIDs, waitUntilEnrolled } from "./utils/misc";

const patchedMobileQuests = new Set<string>();
export const activeQuestIntervals = new Map<string, { progressTimeout: NodeJS.Timeout; rerenderTimeout: NodeJS.Timeout; progress: number; duration: number, type: string; }>();

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

export function QuestButton(): JSX.Element {
    const { questButtonDisplay, questButtonUnclaimed, questButtonBadgeColor, unclaimedUnignoredQuests, onQuestsPage } = settings.use(["questButtonDisplay", "questButtonUnclaimed", "questButtonBadgeColor", "unclaimedUnignoredQuests", "onQuestsPage"]);
    const questButtonBadgeColorRGB = questButtonBadgeColor === null ? null : decimalToRGB(questButtonBadgeColor);

    function showQuestsButton(): boolean {
        const canShow = questButtonDisplay !== "never";
        const alwaysShow = questButtonDisplay === "always";
        return canShow && (alwaysShow || !!unclaimedUnignoredQuests || onQuestsPage);
    }

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
            openPluginModal(Vencord.Plugins.plugins.Questify);
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
            isVisible={showQuestsButton()}
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
        disableQuestsEverything,
        triggerQuestsRerender
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

function shouldDisableQuestTileOptions(quest: Quest, shouldBeIgnored: boolean): boolean {
    const isIgnored = questIsIgnored(quest.id);

    return !(
        (shouldBeIgnored ? isIgnored : !isIgnored)
    );
}

function QuestTileContextMenu(children: React.ReactNode[], props: { quest: any; }) {
    children.unshift((
        <Menu.MenuGroup>
            <Menu.MenuItem
                id={q("ignore-quests")}
                label="Mark as Ignored"
                disabled={shouldDisableQuestTileOptions(props.quest, false)}
                action={() => { addIgnoredQuest(props.quest.id); }}
            />
            <Menu.MenuItem
                id={q("unignore-quests")}
                label="Unmark as Ignored"
                disabled={shouldDisableQuestTileOptions(props.quest, true)}
                action={() => { removeIgnoredQuest(props.quest.id); }}
            />
            {activeQuestIntervals.has(props.quest.id) &&
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
                />
            }
        </Menu.MenuGroup>
    ));
}

export function getQuestTileClasses(originalClasses: string, quest: Quest, color: number | null | undefined, gradient: string | undefined): string {
    const {
        ignoredQuestIDs,
        ignoredQuestProfile,
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

function preprocessQuests(quests: Quest[]): Quest[] {
    const {
        ignoredQuestIDs,
        ignoredQuestProfile,
        reorderQuests,
        unclaimedSubsort,
        claimedSubsort,
        ignoredSubsort,
        expiredSubsort,
        makeMobileQuestsDesktopCompatible,
        completeVideoQuestsInBackground,
        completeGameQuestsInBackground,
        triggerQuestsRerender
    } = settings.use([
        "ignoredQuestIDs",
        "ignoredQuestProfile",
        "reorderQuests",
        "unclaimedSubsort",
        "claimedSubsort",
        "ignoredSubsort",
        "expiredSubsort",
        "makeMobileQuestsDesktopCompatible",
        "completeVideoQuestsInBackground",
        "completeGameQuestsInBackground",
        "triggerQuestsRerender"
    ]);

    if (makeMobileQuestsDesktopCompatible) {
        quests.forEach(quest => {
            const config = quest.config?.taskConfigV2;
            const tasks = config?.tasks;

            if (tasks?.WATCH_VIDEO_ON_MOBILE && !tasks?.WATCH_VIDEO) {
                patchedMobileQuests.add(quest.id);

                tasks.WATCH_VIDEO = {
                    ...tasks.WATCH_VIDEO_ON_MOBILE,
                    type: "WATCH_VIDEO"
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

    if (!reorderQuests || !reorderQuests.trim()) {
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

    // Divide unclaimed quests by completion status before applying subsort.
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
    const {
        restyleQuests,
        ignoredQuestIDs,
        ignoredQuestProfile
    } = settings.use([
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

async function startVideoProgressTracking(quest: Quest, questDuration: number): Promise<void> {
    const questName = normalizeQuestName(quest.config.messages.questName);
    const questEnrolledAt = quest.userStatus?.enrolledAt ? new Date(quest.userStatus.enrolledAt) : null;
    const initialProgress = Math.floor(((new Date()).getTime() - (questEnrolledAt ?? new Date()).getTime()) / 1000) || 1; // Max up to 10 seconds into the future can be reported.

    if (!questEnrolledAt) {
        const enrollmentTimeout = 60000;
        const enrolled = await waitUntilEnrolled(quest, enrollmentTimeout, 15, QuestifyLogger);
        quest = refreshQuest(quest);

        if (!enrolled) {
            QuestifyLogger.warn(`[${getFormattedNow()}] Quest ${questName} not enrolled within ${enrollmentTimeout / 1000} seconds.`);
            return;
        }
    }

    let progressIntervalId: NodeJS.Timeout;
    let currentProgress = initialProgress;
    const timeRemaining = Math.max(0, questDuration - currentProgress);
    const reportEverySec = 10;

    async function handleSendComplete() {
        clearInterval(progressIntervalId);
        clearTimeout(renderIntervalId);
        activeQuestIntervals.delete(quest.id);
        const success = await reportVideoQuestProgress(quest, questDuration, QuestifyLogger);

        if (success) {
            QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} completed.`);
        } else {
            QuestifyLogger.error(`[${getFormattedNow()}] Failed to complete Quest ${questName}.`);
        }
    }

    if (timeRemaining < reportEverySec) {
        progressIntervalId = setTimeout(async () => {
            await handleSendComplete();
        }, timeRemaining * 1000);
    } else {
        reportVideoQuestProgress(quest, initialProgress, QuestifyLogger);

        progressIntervalId = setInterval(async () => {
            currentProgress += reportEverySec;

            if (currentProgress >= questDuration - 10) {
                await handleSendComplete();
            } else {
                await reportVideoQuestProgress(quest, currentProgress, QuestifyLogger);
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

    activeQuestIntervals.set(quest.id, { progressTimeout: progressIntervalId, rerenderTimeout: renderIntervalId, progress: initialProgress, duration: questDuration, type: "watch" });

    if (timeRemaining > 0) {
        QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} will be completed in the background in ${timeRemaining} seconds.`);
    }
}

async function startPlayGameProgressTracking(quest: Quest, questDuration: number): Promise<void> {
    const questName = normalizeQuestName(quest.config.messages.questName);
    const questEnrolledAt = quest.userStatus?.enrolledAt ? new Date(quest.userStatus.enrolledAt) : null;
    const playType = quest.config.taskConfigV2?.tasks.PLAY_ON_DESKTOP || quest.config.taskConfigV2?.tasks.PLAY_ON_XBOX || quest.config.taskConfigV2?.tasks.PLAY_ON_PLAYSTATION || quest.config.taskConfigV2?.tasks.PLAY_ACTIVITY;
    const initialProgress = quest.userStatus?.progress?.[playType?.type || ""]?.value || 0;
    const remaining = Math.max(0, questDuration - initialProgress);
    const heartbeatInterval = 20; // Heartbeats must be at most 2 minutes apart.

    if (!questEnrolledAt) {
        const enrollmentTimeout = 60000;
        const enrolled = await waitUntilEnrolled(quest, enrollmentTimeout, 500, QuestifyLogger);
        quest = refreshQuest(quest);

        if (!enrolled) {
            QuestifyLogger.warn(`[${getFormattedNow()}] Quest ${questName} not enrolled after waiting for ${enrollmentTimeout / 1000} seconds.`);
            return;
        }
    }

    reportPlayGameQuestProgress(quest, false, QuestifyLogger);

    const progressIntervalId = setInterval(async () => {
        const result = await reportPlayGameQuestProgress(quest, false, QuestifyLogger);

        if (result.progress === null) {
            clearInterval(progressIntervalId);
            activeQuestIntervals.delete(quest.id);
            QuestifyLogger.error(`[${getFormattedNow()}] Failed to send heartbeat for Quest ${questName}.`);
            return;
        }

        const isComplete = result.progress >= questDuration;
        const timeRemaining = questDuration - result.progress;

        if (isComplete) {
            clearInterval(progressIntervalId);
            clearTimeout(renderIntervalId);
            activeQuestIntervals.delete(quest.id);
            const success = await reportPlayGameQuestProgress(quest, true, QuestifyLogger);

            if (success) {
                QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} completed.`);
            } else {
                QuestifyLogger.error(`[${getFormattedNow()}] Failed to complete Quest ${questName}.`);
            }
        } else if (timeRemaining < heartbeatInterval) {
            clearInterval(progressIntervalId);
            clearTimeout(renderIntervalId);

            setTimeout(async () => {
                activeQuestIntervals.delete(quest.id);
                const success = await reportPlayGameQuestProgress(quest, true, QuestifyLogger);

                if (success) {
                    QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} completed.`);
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

    activeQuestIntervals.set(quest.id, { progressTimeout: progressIntervalId, rerenderTimeout: renderIntervalId, progress: initialProgress, duration: questDuration, type: "play" });

    if (remaining > 0) {
        QuestifyLogger.info(`[${getFormattedNow()}] Quest ${questName} will be completed in the background in ${remaining} seconds.`);
    }
}

function processQuestForAutoComplete(quest: Quest): boolean {
    const questName = normalizeQuestName(quest.config.messages.questName);
    const { completeGameQuestsInBackground, completeVideoQuestsInBackground } = settings.store;
    const playType = quest.config.taskConfigV2?.tasks.PLAY_ON_DESKTOP || quest.config.taskConfigV2?.tasks.PLAY_ON_XBOX || quest.config.taskConfigV2?.tasks.PLAY_ON_PLAYSTATION || quest.config.taskConfigV2?.tasks.PLAY_ACTIVITY;
    const watchType = quest.config.taskConfigV2?.tasks.WATCH_VIDEO || quest.config.taskConfigV2?.tasks.WATCH_VIDEO_ON_MOBILE;
    const questDuration = playType?.target || watchType?.target || 0;
    const existingInterval = activeQuestIntervals.get(quest.id);

    if (quest.userStatus?.completedAt || existingInterval) {
        return true;
    } else if (!playType && !watchType) {
        QuestifyLogger.warn(`[${getFormattedNow()}] Could not recognize the quest type for ${questName}.`);
        return true;
    } else if ((watchType && !completeVideoQuestsInBackground) || (playType && (!completeGameQuestsInBackground || !IS_DISCORD_DESKTOP))) {
        return true;
    } else if (!questDuration) {
        QuestifyLogger.warn(`[${getFormattedNow()}] Could not find duration for quest ${questName}.`);
        return true;
    } else if (watchType) {
        startVideoProgressTracking(quest, questDuration);
        return false;
    } else if (playType) {
        startPlayGameProgressTracking(quest, questDuration);
        return false;
    }

    return true; // True means continue as normal, false means prevent default action.
}

function shouldDisableQuestAcceptedButton(quest: Quest): boolean | null {
    const { completeGameQuestsInBackground } = settings.store;

    if (activeQuestIntervals.has(quest.id)) {
        return true;
    } else if (completeGameQuestsInBackground) {
        if (!IS_DISCORD_DESKTOP) {
            return true;
        } else {
            return false;
        }
    }

    return null;
}

function getQuestAcceptedButtonText(quest: Quest): string | null {
    const { completeGameQuestsInBackground, completeVideoQuestsInBackground } = settings.store;
    const playType = quest.config.taskConfigV2?.tasks.PLAY_ON_DESKTOP || quest.config.taskConfigV2?.tasks.PLAY_ON_XBOX || quest.config.taskConfigV2?.tasks.PLAY_ON_PLAYSTATION || quest.config.taskConfigV2?.tasks.PLAY_ACTIVITY;
    const watchType = quest.config.taskConfigV2?.tasks.WATCH_VIDEO || quest.config.taskConfigV2?.tasks.WATCH_VIDEO_ON_MOBILE;
    const taskType = playType || watchType;
    const duration = taskType?.target || 0;
    const intervalData = activeQuestIntervals.get(quest.id);
    const progress = Math.min(
        (intervalData?.progress ?? (quest.userStatus?.progress?.[taskType?.type || ""]?.value || 0)),
        duration
    );
    const timeRemaining = Math.max(0, duration - progress);
    const progressFormatted = `${String(Math.floor(timeRemaining / 60)).padStart(2, "0")}:${String(timeRemaining % 60).padStart(2, "0")}`;

    if ((playType && completeGameQuestsInBackground) || (watchType && completeVideoQuestsInBackground)) {
        if (!!intervalData) {
            return getIntlMessage("QUESTS_VIDEO_WATCH_RESUME_WITH_TIME_CTA", { remainTime: progressFormatted })[0].replace(getIntlMessage("GAME_LIBRARY_UPDATES_ACTION_RESUME"), getIntlMessage(playType ? "USER_ACTIVITY_PLAYING" : "USER_ACTIVITY_WATCHING"));
        } else if (watchType || (playType && IS_DISCORD_DESKTOP)) {
            return getIntlMessage("QUESTS_VIDEO_WATCH_RESUME_WITH_TIME_CTA", { remainTime: progressFormatted })[0];
        }
    }

    return null;
}

function getActiveQuestClosestToCompletion(): Quest | null {
    let closestQuest: Quest | null = null;
    let closestTimeRemaining = Infinity;

    activeQuestIntervals.forEach((interval, questId) => {
        const quest = QuestsStore.getQuest(questId);

        if (!quest) {
            return;
        }

        const timeRemaining = interval.duration - interval.progress;

        if (timeRemaining < closestTimeRemaining) {
            closestTimeRemaining = timeRemaining;
            closestQuest = quest;
        }
    });

    return closestQuest;
}

export default definePlugin({
    name: "Questify",
    description: "Enhance your Quest experience with a suite of features, or disable them entirely if they're not your thing.",
    authors: [EquicordDevs.Etorix],
    dependencies: ["ServerListAPI"],
    startAt: StartAt.Init, // Needed in order to beat Read All Messages to inserting above the server list.
    settings,

    formatLowerBadge,
    getQuestTileStyle,
    preprocessQuests,
    getQuestTileClasses,
    shouldPreloadQuestAssets,
    shouldHideQuestPopup,
    shouldHideDiscoveryTab,
    shouldPreventFetchingQuests,
    shouldHideBadgeOnUserProfiles,
    shouldHideGiftInventoryRelocationNotice,
    shouldHideFriendsListActiveNowPromotion,
    shouldDisableQuestAcceptedButton,
    getActiveQuestClosestToCompletion,
    getQuestAcceptedButtonText,
    processQuestForAutoComplete,
    activeQuestIntervals,

    patches: [
        {
            find: "could not play audio",
            group: true,
            replacement: [
                {
                    // Enables external audio sources for playing audio.
                    match: /(\i\(\d+\)\(".\/".concat\(this.name,".mp3"\)\))/,
                    replace: "this.name.startsWith('https')?this.name:$1"
                },
                {
                    // Adds an optional callback to the audio player. This is needed to detect
                    // when the audio has finished playing as playWithListener() relies on a duration
                    // variable which is never present.
                    match: /(constructor\(\i,\i,\i,\i)(\){)/,
                    replace: "$1,callback$2this.callback=callback||null,"
                },
                {
                    // Makes use of the callback if provided.
                    match: /(?<=.onended=\(\)=>)(this.destroyAudio\(\))/,
                    replace: "{this.callback?this.callback():null;$1;}"
                }
            ]
        },
        {
            // Hides the notice in the gift inventory that Quests have been relocated to the Discovery tab.
            find: "quests-wumpus-hikes-mountain-transparent-background",
            replacement: {
                match: /return(\(0,\i.\i\)\("div",{className:)/,
                replace: "return $self.shouldHideGiftInventoryRelocationNotice()?null:$1"
            }
        },
        {
            // Hides Quests tab in the Discovery page.
            find: "GlobalDiscoverySidebar",
            group: true,
            replacement: [
                {
                    match: /(let \i=function\(\){)/,
                    replace: "$1const shouldHideDiscoveryTab=$self.shouldHideDiscoveryTab();"
                },
                {
                    match: /(GLOBAL_DISCOVERY_TABS).map/,
                    replace: '$1.filter(tab=>!(tab==="quests"&&shouldHideDiscoveryTab)).map'
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
            // Allows in-progress quests to still show.
            find: "QUESTS_BAR,questId",
            replacement: {
                match: /return null==(\i)\?null:\(/,
                replace: "return !$self.shouldHideQuestPopup($1)&&("
            }
        },
        {
            // Replaces the default displayed Quest with the soonest to
            // be completed Quest which is actively being auto-completed.
            find: "questDeliveryOverride)?",
            replacement: {
                match: /(\i=)(\i.\i.questDeliveryOverride)/,
                replace: "$1$self.getActiveQuestClosestToCompletion()??$2"
            }
        },
        {
            // Hides the Friends List "Active Now" promotion.
            find: '"application-stream-"',
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
                    match: /(var \i,\i,\i,\i,\i,\i,\i;\i.\i.dispatch\({)/,
                    replace: "if($self.shouldPreventFetchingQuests())return;$1"
                }
            ]
        },
        {
            // Adds a feedback prop to the SearchableSelect component which will display on invalid searches.
            find: '"onSearchChange",',
            group: true,
            replacement: [
                {
                    // Extracts the custom dropdown prop before the variable is overwritten.
                    match: /(\((\i),\i\){)(var{options:\i,)/,
                    replace: "$1const vcDynamicDropdownFeedback=$2.feedback;$3"
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
                }
            ]
        },
        {
            // Adds a maxDigits prop to the LowerBadge component which allows for not truncating, or for truncating at a specific threshold.
            find: "STATUS_DANGER,disableColor",
            group: true,
            replacement: [
                {
                    // Extracts the custom maxDigits prop.
                    match: /(=>{var{count:\i,)/,
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
                    match: /function (\i\((\i))\){return (.{0,100}?k\+"\))/,
                    replace: "function $1,maxDigits){return maxDigits===undefined?($3):$self.formatLowerBadge($2,maxDigits)[0]"
                }
            ]
        },
        {
            find: "id:\"quest-tile-\".concat",
            group: true,
            replacement: [
                {
                    // Restyles quest tiles with colors.
                    match: /className:(\i\(\)\(\i.container,\i\)),/,
                    replace: "className:$self.getQuestTileClasses($1,arguments[0].quest),style:$self.getQuestTileStyle(arguments[0].quest),"
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
                }
            ]
        },
        {
            // Prevents default pinning of specific Quests to the top of the list.
            find: "questTile,{[",
            replacement: {
                match: /\i.unshift\(\i\):(\i.push\(\i\))/,
                replace: "$1:$1"
            }
        },
        {
            // Sorts the "All Quests" tab quest tiles.
            // Also sets mobile-only Quests as desktop compatible if the setting is enabled.
            find: ".ALL);return(",
            replacement: {
                match: /(quests:(\i).{0,100}?quests:)\i/,
                replace: "$1$self.preprocessQuests($2)"
            }
        },
        {
            // Sorts the "Claimed Quests" tab quest tiles.
            find: ".ALL)}):(",
            replacement: {
                match: /(claimedQuests:(\i).{0,50}?;)/,
                replace: "$1$2=$self.preprocessQuests($2);"
            }
        },
        {
            // Whether preloading assets is enabled or not, the placeholders loading
            // before the assets causes a lot of element shifting, whereas if
            // the elements load immediately instead, it doesn't.
            find: "rewardDescriptionContainer,children",
            replacement: {
                match: /showPlaceholder:!\i/,
                replace: "showPlaceholder:false"
            }
        },
        {
            // Sets intervals to progress Video Quests and Play Game Quests in the background.
            find: "IN_PROGRESS:if(",
            group: true,
            replacement: [
                {
                    // Resume Video Quest
                    match: /(onClick:\(\)=>)(\(0,\i.openVideoQuestModal\)\({quest:(\i))/,
                    replace: "$1$self.processQuestForAutoComplete($3)&&$2"
                },
                {
                    // Start Quest
                    match: /(onClick:.{0,10}?{)(.{0,5}?0,\i.\i\)\((\i))/,
                    replace: "$1const questifyContinue=$self.processQuestForAutoComplete($3);$2"
                },
                {
                    // Open Video Modal
                    match: /(\i\?)(\(0,\i.openVideoQuestModal\)\({quest:(\i))/,
                    replace: "$1questifyContinue&&$2"
                },
                {
                    // The "Resume (XX:XX)" text is changed to "Watching (XX:XX)" if the Quest is active.
                    match: /(if\(\i\)return{text:)/,
                    replace: "$1$self.getQuestAcceptedButtonText(arguments[0].quest)??",
                },
                {
                    // Add trigger to memo for rerendering the progress label.
                    match: /(\i.intl.string\(\i.\i#{intl::QUESTS_SEE_CODE}\)}\)}},\[)/,
                    replace: "$1$self.settings.store.triggerQuestsRerender,"
                },
            ]
        },
        {
            // Sets intervals to progress Play Game Quests in the background.
            // Triggers if a Quest has already been started but was interrupted, such as by a reload.
            find: "platformSelectorPrimary,",
            group: true,
            replacement: [
                {
                    // Initial and subsequent select drop down for picking or changing a platform.
                    match: /(#{intl::QUEST_MULTIPLATFORM_SELECT_SUBTITLE}.{0,50}select:)(\i)(,serialize:\i=>{)/g,
                    replace: "$1(platform)=>{$self.processQuestForAutoComplete(arguments[0].quest),$2(platform)}$3"
                },
                {
                    // The Quest Accepted button is disabled by default. If the user reloads the client, they need a way
                    // to resume the automatic completion, so patch in optionally enabling it if the feature is enabled.
                    match: /(START_QUEST_CTA.{0,400}?)(!0)/,
                    replace: "$1$self.shouldDisableQuestAcceptedButton(arguments[0].quest)??$2"
                },
                {
                    // When the Quest Accepted button which has been enabled again by the above patch is
                    // clicked, resume the automatic completion of the Quest and disable the button again.
                    match: /(disabled:\i.\i.\i\[)/,
                    replace: "onClick:()=>{$self.processQuestForAutoComplete(arguments[0].quest)},$1",
                },
                {
                    // The "Quest Accepted" text is changed to "Resume" if the Quest is in progress but not active.
                    match: /(\i.intl.string\(\i.\i#{intl::QUEST_ACCEPTED}\))/,
                    replace: "$self.getQuestAcceptedButtonText(arguments[0].quest)??$1"
                }
            ]
        },
    ],

    contextMenus: {
        "quests-entry": QuestTileContextMenu
    },

    flux: {
        CHANNEL_SELECT(data) {
            settings.store.onQuestsPage = (window.location.pathname === questPath);
        },

        QUESTS_FETCH_CURRENT_QUESTS_SUCCESS(data) {
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
    },

    renderQuestifyButton: ErrorBoundary.wrap(QuestButton, { noop: true }),

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderQuestifyButton);
        const interval = settings.store.fetchingQuestsInterval;
        const intervalValid = interval >= minimumAutoFetchIntervalValue && interval <= maximumAutoFetchIntervalValue;

        if (!!intervalValid && autoFetchCompatible()) {
            startAutoFetchingQuests();
        }
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderQuestifyButton);
        stopAutoFetchingQuests();
    }
});
