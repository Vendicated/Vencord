/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { ErrorBoundary } from "@components/index";
import { openPluginModal } from "@components/PluginSettings/PluginModal";
import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { ContextMenuApi, Menu, NavigationRouter } from "@webpack/common";
import { JSX } from "react";

import { addIgnoredQuest, autoFetchCompatible, fetchAndAlertQuests, maximumAutoFetchIntervalValue, minimumAutoFetchIntervalValue, questIsIgnored, removeIgnoredQuest, settings, startAutoFetchingQuests, stopAutoFetchingQuests, validateAndOverwriteIgnoredQuests } from "./settings";
import { GuildlessServerListItem, Quest, QuestIcon, QuestMap, RGB } from "./utils/components";
import { adjustRGB, decimalToRGB, enrollInQuest, fetchAndDispatchQuests, formatLowerBadge, getFormattedNow, isDarkish, leftClick, middleClick, normalizeQuestName, q, QuestifyLogger, questPath, QuestsStore, reportVideoQuestProgress, rightClick } from "./utils/misc";

const patchedMobileQuests = new Set<string>();
const activeQuestIntervals = new Map<string, NodeJS.Timeout>();

function questMenuUnignoreClicked(): void {
    validateAndOverwriteIgnoredQuests("");
}

function questMenuIgnoreClicked(): void {
    const quests = (QuestsStore.quests as QuestMap);
    const ignoredQuestsSet = new Set();

    for (const quest of quests.values()) {
        const questName = normalizeQuestName(quest.config.messages.questName);
        const claimedQuest = quest.userStatus?.claimedAt;
        const questExpired = new Date(quest.config.expiresAt) < new Date();

        if (!claimedQuest && !questExpired) {
            ignoredQuestsSet.add(questName);
        }
    }

    settings.store.ignoredQuests = Array.from(ignoredQuestsSet).join("\n");
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
                        action={questMenuIgnoreClicked}
                        disabled={!unclaimedUnignoredQuests}
                    />
                    <Menu.MenuItem
                        id={q("unignore-quests-option")}
                        label="Reset Ignored List"
                        action={questMenuUnignoreClicked}
                        disabled={!settings.store.ignoredQuests}
                    />
                    <Menu.MenuItem
                        id={q("fetch-quests-option")}
                        label="Fetch Quests"
                        action={() => fetchAndAlertQuests("Questify-Manual", QuestifyLogger)}
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
        disableQuestsEverything
    } = settings.use([
        "disableQuestsPopupAboveAccountPanel",
        "disableQuestsEverything"
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
    const questName = normalizeQuestName(quest.config.messages.questName);
    const completed = !!quest.userStatus?.completedAt;
    const expired = new Date(quest.config.expiresAt) < new Date();

    return completed || expired || !questName || (
        shouldBeIgnored
            ? !questIsIgnored(questName)
            : questIsIgnored(questName)
    );
}

function QuestTileContextMenu(children: React.ReactNode[], props: { quest: any; }) {
    children.unshift((
        <Menu.MenuGroup>
            <Menu.MenuItem
                id={q("ignore-quests")}
                label="Mark as Ignored"
                disabled={shouldDisableQuestTileOptions(props.quest, false)}
                action={() => { addIgnoredQuest(props.quest.config.messages.questName); }}
            />
            <Menu.MenuItem
                id={q("unignore-quests")}
                label="Unmark as Ignored"
                disabled={shouldDisableQuestTileOptions(props.quest, true)}
                action={() => { removeIgnoredQuest(props.quest.config.messages.questName); }}
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
        restyleQuestsGradient,
        ignoredQuests
    } = settings.use([
        "restyleQuestsUnclaimed",
        "restyleQuestsClaimed",
        "restyleQuestsIgnored",
        "restyleQuestsExpired",
        "restyleQuestsGradient",
        "ignoredQuests"
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

    const questName = normalizeQuestName(quest.config.messages.questName);
    const claimedQuest = !!quest.userStatus?.claimedAt;
    const questExpired = new Date(quest.config.expiresAt) < new Date();
    const questIgnored = questIsIgnored(questName);
    const baseClasses = originalClasses.split(" ").filter(cls => cls && !customClasses.includes(cls));
    const returnClasses: string[] = [...baseClasses];
    const hasColorOverride = color !== undefined;
    const skipColorCheck = hasColorOverride && color === null;
    let isRestyledAndDarkish: any = null;

    if (!skipColorCheck) {
        if (claimedQuest && (color || restyleQuestsClaimed !== null)) {
            returnClasses.push(q("quest-item-restyle"));
            isRestyledAndDarkish = isDarkish(decimalToRGB(color ?? restyleQuestsClaimed), 0.875);
        } else if (questExpired && (color || restyleQuestsExpired !== null)) {
            returnClasses.push(q("quest-item-restyle"));
            isRestyledAndDarkish = isDarkish(decimalToRGB(color ?? restyleQuestsExpired), 0.875);
        } else if (questIgnored && (color || restyleQuestsIgnored !== null)) {
            returnClasses.push(q("quest-item-restyle"));
            isRestyledAndDarkish = isDarkish(decimalToRGB(color ?? restyleQuestsIgnored), 0.875);
        } else if (!claimedQuest && !questExpired && !questIgnored && (color || restyleQuestsUnclaimed !== null)) {
            returnClasses.push(q("quest-item-restyle"));
            isRestyledAndDarkish = isDarkish(decimalToRGB(color ?? restyleQuestsUnclaimed), 0.875);
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
        ignoredQuests,
        reorderQuests,
        unclaimedSubsort,
        claimedSubsort,
        ignoredSubsort,
        expiredSubsort,
        makeMobileQuestsDesktopCompatible
    } = settings.use([
        "ignoredQuests",
        "reorderQuests",
        "unclaimedSubsort",
        "claimedSubsort",
        "ignoredSubsort",
        "expiredSubsort",
        "makeMobileQuestsDesktopCompatible"
    ]);

    if (makeMobileQuestsDesktopCompatible) {
        quests.forEach(quest => {
            const config = quest.config.taskConfigV2;

            if (config.tasks.WATCH_VIDEO_ON_MOBILE && !config.tasks.WATCH_VIDEO) {
                patchedMobileQuests.add(quest.id);
                config.tasks.WATCH_VIDEO = {
                    ...config.tasks.WATCH_VIDEO_ON_MOBILE,
                    type: "WATCH_VIDEO"
                };
            }
        });
    } else if (patchedMobileQuests.size > 0) {
        patchedMobileQuests.forEach(questId => {
            const quest = quests.find(q => q.id === questId);

            if (quest) {
                const config = quest.config.taskConfigV2;
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
        unclaimed: []
    };

    quests.forEach(quest => {
        const questName = normalizeQuestName(quest.config.messages.questName);
        const claimedQuest = !!quest.userStatus?.claimedAt;
        const questExpired = new Date(quest.config.expiresAt) < new Date();
        const questIgnored = questIsIgnored(questName);

        if (claimedQuest) {
            questGroups.claimed.push(quest);
        } else if (questExpired) {
            questGroups.expired.push(quest);
        } else if (questIgnored) {
            questGroups.ignored.push(quest);
        } else {
            questGroups.unclaimed.push(quest);
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

    questGroups.unclaimed.sort(createSortFunction(unclaimedSubsort || "Recent DESC"));
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

function getQuestTileStyle(quest: Quest): Record<string, string> {
    const {
        restyleQuests,
        ignoredQuests,
    } = settings.use([
        "restyleQuests",
        "ignoredQuests",
    ]);

    const style: Record<string, string> = {};
    let themeColor: RGB | null = null;

    const questName = normalizeQuestName(quest.config.messages.questName);
    const claimedQuest = quest.userStatus?.claimedAt;
    const questExpired = new Date(quest.config.expiresAt) < new Date();
    const questIgnored = questIsIgnored(questName);
    const restyleUnclaimed = settings.store.restyleQuestsUnclaimed;
    const restyleClaimed = settings.store.restyleQuestsClaimed;
    const restyleIgnored = settings.store.restyleQuestsIgnored;
    const restyleExpired = settings.store.restyleQuestsExpired;

    const claimedColor = restyleClaimed !== null ? decimalToRGB(restyleClaimed) : "";
    const unclaimedColor = restyleUnclaimed !== null ? decimalToRGB(restyleUnclaimed) : "";
    const ignoredColor = restyleIgnored !== null ? decimalToRGB(restyleIgnored) : "";
    const expiredColor = restyleExpired !== null ? decimalToRGB(restyleExpired) : "";
    const dummyProvided = quest.dummyColor !== undefined;
    const dummyColor = (quest.dummyColor !== undefined && quest.dummyColor !== null) ? decimalToRGB(quest.dummyColor) : null;

    if (claimedQuest && claimedColor) {
        themeColor = dummyProvided ? dummyColor : claimedColor;
    } else if (!claimedQuest && questExpired && expiredColor) {
        themeColor = dummyProvided ? dummyColor : expiredColor;
    } else if (!claimedQuest && !questExpired && questIgnored && ignoredColor) {
        themeColor = dummyProvided ? dummyColor : ignoredColor;
    } else if (!claimedQuest && !questExpired && !questIgnored && unclaimedColor) {
        themeColor = dummyProvided ? dummyColor : unclaimedColor;
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

function startProgressTracking(quest: Quest, questDuration: number, initialProgress: number): void {
    const start = new Date();
    const threshold = 5;

    if (!initialProgress) {
        enrollInQuest(quest, QuestifyLogger).then(success => {
            const enrollmentDuration = Math.floor((new Date().getTime() - start.getTime()) / 1000);

            if (success && enrollmentDuration < threshold) {
                reportVideoQuestProgress(quest, threshold, QuestifyLogger);
            }
        });

        initialProgress = threshold;
    }

    let currentProgress = initialProgress;

    const intervalId = setInterval(() => {
        currentProgress += threshold;

        if (currentProgress >= questDuration - 10) {
            clearInterval(intervalId);
            activeQuestIntervals.delete(quest.id);
            reportVideoQuestProgress(quest, questDuration, QuestifyLogger).then(success => {
                if (success) {
                    QuestifyLogger.info(`Quest ${quest.config.messages.questName} completed.`);
                }
            });
        } else {
            reportVideoQuestProgress(quest, currentProgress, QuestifyLogger);
        }
    }, threshold * 1000);

    activeQuestIntervals.set(quest.id, intervalId);

    const timeRemaining = Math.max(0, questDuration - initialProgress);
    QuestifyLogger.info(`Quest ${quest.config.messages.questName} will be completed in the background in ${timeRemaining} seconds.`);
}

function processVideoQuest(quest: Quest): boolean {
    const { preventVideoQuestsModal, completeVideoQuestsInBackgroundOption } = settings.store;

    if (quest.userStatus?.completedAt) {
        return true;
    }

    if (!completeVideoQuestsInBackgroundOption) {
        return true;
    }

    const watchType = quest.config.taskConfigV2.tasks.WATCH_VIDEO || quest.config.taskConfigV2.tasks.WATCH_VIDEO_ON_MOBILE;

    if (!watchType) {
        return true;
    }

    const questDuration = watchType.target || 0;

    if (!questDuration) {
        return true;
    }

    const existingInterval = activeQuestIntervals.get(quest.id);

    if (existingInterval) {
        return true;
    }

    const questEnrolledAt = quest.userStatus?.enrolledAt ? new Date(quest.userStatus.enrolledAt) : new Date();
    const now = new Date();
    const timeElapsed = Math.floor((now.getTime() - questEnrolledAt.getTime()) / 1000);
    const timeRemaining = Math.max(0, questDuration - timeElapsed);

    if (timeRemaining <= 10) {
        reportVideoQuestProgress(quest, questDuration, QuestifyLogger).then(success => {
            if (success) {
                QuestifyLogger.info(`Quest ${quest.config.messages.questName} completed.`);
            }
        });
    } else {
        startProgressTracking(quest, questDuration, timeElapsed);
    }

    return !preventVideoQuestsModal;
}

export default definePlugin({
    name: "Questify",
    description: "Enhance your Quest experience with a suite of features, or disable them entirely if they're not your thing.",
    authors: [Devs.Etorix],
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
    processVideoQuest,

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
                    match: /(constructor\(\i,\i,\i,\i)(\){(\i)[^}]+)/,
                    replace: "$1,callback$2,$3(this,'callback',void 0),this.callback=callback||null;"
                },
                {
                    // Makes use of the callback if provided.
                    match: /.onended=\(\)=>this.destroyAudio\(\)/,
                    replace: ".onended=()=>{this.callback?this.callback():null;this.destroyAudio();}"
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
                    match: /GLOBAL_DISCOVERY_TABS.map/,
                    replace: 'GLOBAL_DISCOVERY_TABS.filter(tab=>!(tab==="quests"&&shouldHideDiscoveryTab)).map'
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
                    match: /badges:(\i)/,
                    replace: 'badges:$1.filter(badge=>!(badge.id==="quest_completed"&&shouldHideBadgeOnUserProfiles))',
                }
            ]
        },
        {
            // Hides the new Quest popup above the account panel.
            find: "QUESTS_BAR,questId",
            replacement: {
                match: /return null==(\i)\?null:\(/,
                replace: "return !$self.shouldHideQuestPopup($1)&&("
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
            // Prevents fetching quests.
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
                    match: /(\i.intl.string\(\i.\i\["[^"]+"\]\)\}\)}\))/,
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
                    // Passes the custom LowerBadge prop to the rounding function.
                    match: /(style:\i}=(\i)[^}]+}[^}]+},\i\),{children:\i\(\i)/,
                    replace: "$1,$2.maxDigits"
                },
                {
                    // Makes use of the custom prop if provided by using custom logic for negatives and truncation.
                    // If the prop is not provided, assume default behavior for native badges or other plugins not
                    // utilizing the custom prop.
                    match: /function (\i\((\i))\){return (\i<1e3[^+]+\+"\))/,
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
                    match: /(concat\((\i)[^}]+},)className:(\i\(\)\([^)]+\)),/,
                    replace: "$1className:$self.getQuestTileClasses($3, $2),style:$self.getQuestTileStyle($2),"
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
            // Prevents default pinning of specific quests to the top of the list.
            find: "QUEST_HOME_DESKTOP},",
            replacement: {
                match: /\i.unshift\(\i\):(\i.push\(\i\))/,
                replace: "$1:$1"
            }
        },
        {
            // Sorts the "All Quests" tab quest tiles.
            // Also sets mobile-only quests as desktop compatible if the setting is enabled.
            find: ".ALL);return(",
            replacement: {
                match: /(quests:(\i)[^;]+;)/,
                replace: "$1$2=$self.preprocessQuests($2);"
            }
        },
        {
            // Sorts the "Claimed Quests" tab quest tiles.
            find: ".ALL)}):(",
            replacement: {
                match: /(claimedQuests:(\i)[^;]+;)/,
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
            // Sets intervals to progress video quests in the background.
            find: "IN_PROGRESS:if(",
            group: true,
            replacement: [
                {
                    match: /(onClick:\(\)=>)(\(0,\i.openVideoQuestModal\)\({quest:(\i))/,
                    replace: "$1$self.processVideoQuest($3)&&$2"
                },
                {
                    match: /(\i\?)(\(0,\i.openVideoQuestModal\)\({quest:(\i))/,
                    replace: "$1$self.processVideoQuest($3)&&$2"
                }
            ]
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
            const source = data.source ? ` [${data.source}]` : "";
            QuestifyLogger.info(`[${getFormattedNow()}] [QUESTS_FETCH_CURRENT_QUESTS_SUCCESS]${source}\n`, data);
            validateAndOverwriteIgnoredQuests(undefined, data.quests);
        },

        QUESTS_CLAIM_REWARD_SUCCESS(data) {
            QuestifyLogger.info(`[${getFormattedNow()}] [QUESTS_CLAIM_REWARD_SUCCESS]\n`, data);
            fetchAndDispatchQuests("Questify", QuestifyLogger);
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
