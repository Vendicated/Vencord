/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { Settings } from "@api/Settings";
import { ErrorBoundary } from "@components/index";
import definePlugin, { StartAt } from "@utils/types";
import { findComponentByCodeLazy, onceReady } from "@webpack";
import type { JSX } from "react";

import { disguiseHomeButton, QuestButton, showQuestButton } from "./components/questButton";
import { QuestTileContextMenu } from "./components/questTileContextMenu";
import { getQuestifySettings } from "./settings/access";
import { resetQuestsToResume, startAutoFetchingQuests, stopAutoFetchingQuests } from "./settings/fetching";
import { validateIgnoredQuests } from "./settings/ignoredQuests";
import { rerenderQuests, useQuestRerender } from "./settings/rerender";
import { disposeRestartTracking, initializeRestartTracking, promptToRestartIfDirty } from "./settings/restartTracking";
import { settings } from "./settings/store";
import { getSettingsModalOpen, initialQuestDataFetched, setInitialQuestDataFetched, setSettingsModalOpen } from "./state";
import { AudioPlayer } from "./utils/audio";
import { canAutoCompleteQuest, getActiveAutoCompletes, getQuestAutoCompleteProgress, getQuestButtonProps, getQuestPanelSubtitleText, hasEnabledAutoCompleteQuestTypes, processQuestForAutoComplete, resumeInterruptedAutoCompletes, setHeartbeatStackTracePatchSucceeded, setVideoProgressStackTracePatchSucceeded, stopAllAutoCompletes, stopAutoCompletesForRunningGames, stopQuestAutoComplete } from "./utils/completion";
import { canOpenDevToolsWindow, fetchAndDispatchQuests, openDevToolsWindow, snakeToCamel } from "./utils/fetching";
import { normalizeQuestName } from "./utils/filtering";
import { notifyQuestCompletion, QL } from "./utils/logging";
import { getQuestPanelOverride, getQuestPanelPercentComplete, shouldForceQuestPanelVisible } from "./utils/questState";
import { getLastFilterChoices, getLastSortChoice, getQuestTileClasses, getQuestTileStyle, setLastFilterChoices, setLastSortChoice, shouldPreloadQuestAssets, sortQuests } from "./utils/questTiles";
import { type Quest, QuestStore, type QuestUserStatus } from "./utils/types";
import { formatLowerBadge, QUEST_PAGE } from "./utils/ui";
import { Devs } from "@utils/constants";

let isSwitchingAccount = false;
let didAttemptAutoCompleteResume = false;
const notifiedCompletedQuests = new Set<string>();

function setOnQuestsPage(force?: boolean): void {
    getQuestifySettings().isOnQuestsPage = force ?? (window.location.pathname === QUEST_PAGE);
}

function startPerAccountTasks(source: string): void {
    const startedAt = Date.now();

    setOnQuestsPage();
    startAutoFetchingQuests();
    resumeAutoCompletesIfReady();
    fetchAndDispatchQuests();

    QL.info(`START_TASKS-${source.toUpperCase()}`, { startedAt });
}

function stopPerAccountTasks(source: string, preserveResume: boolean = true): void {
    const stoppedAt = Date.now();

    setOnQuestsPage();
    stopAutoFetchingQuests();
    notifiedCompletedQuests.clear();
    stopAllAutoCompletes({ manual: false, preserveResume, terminalHeartbeat: true });

    QL.info(`STOP_TASKS-${source.toUpperCase()}`, { stoppedAt });
}

function resumeAutoCompletesIfReady(): void {
    if (didAttemptAutoCompleteResume || !initialQuestDataFetched) {
        return;
    }

    didAttemptAutoCompleteResume = true;
    resumeInterruptedAutoCompletes();
}

const Button = findComponentByCodeLazy("BUTTON_LOADING_STARTED_LABEL)),");

function enrolledIncompleteButton(args: { quest: Quest, size: string; }): JSX.Element | null {
    const props = getQuestButtonProps({ quest: args.quest });

    if (!props) {
        return null;
    }

    return (
        <ErrorBoundary noop>
            <Button
                size={args.size}
                variant="secondary"
                disabled={false}
                fullWidth={true}
                {...props}
            />
        </ErrorBoundary>
    );
}

export default definePlugin({
    name: "Questify",
    description: "Enhance specific Quest features, disable annoyances, or completely remove Quests.",
    authors: [Devs.Etorix],
    dependencies: ["ServerListAPI"],
    startAt: StartAt.Init, // Needed in order to beat Read All Messages to inserting above the server list.
    settings,

    canOpenDevToolsWindow,
    canAutoCompleteQuest,
    disguiseHomeButton,
    enrolledIncompleteButton,
    formatLowerBadge,
    getActiveAutoCompletes,
    getLastFilterChoices,
    getLastSortChoice,
    getQuestAutoCompleteProgress,
    getQuestButtonProps,
    getQuestPanelOverride,
    getQuestPanelPercentComplete,
    getQuestPanelSubtitleText,
    getQuestTileClasses,
    getQuestTileStyle,
    getSettingsModalOpen,
    hasEnabledAutoCompleteQuestTypes,
    normalizeQuestName,
    openDevToolsWindow,
    processQuestForAutoComplete,
    rerenderQuests,
    setHeartbeatStackTracePatchSucceeded,
    setLastFilterChoices,
    setLastSortChoice,
    setVideoProgressStackTracePatchSucceeded,
    shouldForceQuestPanelVisible,
    shouldPreloadQuestAssets,
    sortQuests,
    stopQuestAutoComplete,
    useQuestRerender,

    patches: [
        {
            find: "could not play audio",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything && !Settings.plugins.AudioPlayerAPI?.enabled,
            replacement: [
                {
                    // Enables external audio sources for playing audio.
                    match: /(?<=new Audio;\i\.src=)/,
                    replace: "this.name.startsWith('https')?this.name:"
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
            // Prevent color picker modal and dummy Quest button context menu modal
            // from force scrolling back up to the top of the settings when closed.
            find: ",NodeFilter.SHOW_ELEMENT,{acceptNode:function(",
            replacement: {
                match: /\.focus\(\)/g,
                replace: ".focus({preventScroll:$self.getSettingsModalOpen()?!0:undefined})"
            }
        },
        {
            // Exports the guildless server list item component used by the Quest button.
            find: '="DOWNLOAD_APPS";function',
            replacement: {
                match: /(?=\i:\(\)=>\i.{0,30000}?asContainer:!\i.{0,50};let (\i)=\i.forwardRef\(function)/,
                replace: "GuildlessServerListItemComponent:()=>$1,"
            }
        },
        {
            // Prevents the DMs Quests tab from counting as part of the
            // DM button highlight logic while the Quest button is visible.
            find: "GLOBAL_DISCOVERY),",
            predicate: () => !getQuestifySettings().disableQuestsEverything && showQuestButton(getQuestifySettings().questButtonDisplay, 1, true),
            replacement: {
                match: /(pathname:(\i)}.{0,400}?return )/,
                replace: "$1$self.disguiseHomeButton($2)?false:"
            }
        },
        {
            // Hides the Quest icon on members list nameplates.
            find: '("ActivityStatus"),',
            predicate: () => getQuestifySettings().disableQuestsEverything || getQuestifySettings().disableMembersListPromo,
            replacement: {
                match: /(,hasQuest:)(?=\i=!1)/,
                replace: ",questifyInvalid1:"
            }
        },
        {
            // Hides the Friends List "Active Now" promotion.
            find: "`application-stream-",
            predicate: () => getQuestifySettings().disableQuestsEverything || getQuestifySettings().disableFriendsListPromo,
            replacement: [
                {
                    match: /(?<=let{party:\i,onChannelContextMenu:\i,)quest:(\i)/,
                    replace: "questifyInvalid2:$1=null"
                }
            ]
        },
        {
            // Hides Quests tab in the Discovery page.
            find: "GLOBAL_DISCOVERY_SIDEBAR},",
            predicate: () => getQuestifySettings().disableQuestsEverything || getQuestifySettings().disableRelocationNotices,
            replacement: [
                {
                    match: /(GLOBAL_DISCOVERY_TABS).map/,
                    replace: '$1.filter(tab=>tab!=="quests").map'
                }
            ]
        },
        {
            // Hides Quests tab in the DMs tab list.
            find: ".QUEST_HOME):",
            predicate: () => getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(?<="family-center"\):null,)/,
                    replace: "null&&"
                }
            ]
        },
        {
            // Hides the sponsored banner on the Quests page.
            find: "QUEST_HOME)},[]),",
            predicate: () => !getQuestifySettings().disableQuestsEverything && getQuestifySettings().disableSponsoredBanner,
            replacement: {
                match: /(?<=(\i),isLoading:(\i)}=\(0,\i.\i\)\(\i\);)/,
                replace: "if(true){$1=null;$2=false;};"
            }
        },
        {
            // Hides the Quest & Orbs badges on user profiles.
            find: ".MODAL]:26",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything && getQuestifySettings().disableOrbsAndQuestsBadges,
            replacement: [
                {
                    match: /(badges:\i)/,
                    replace: '$1.filter(badge=>!["quest_completed","orb_profile_badge"].includes(badge.id))',
                }
            ]
        },
        {
            // Overrides the account panel Quest popup and progress display.
            find: "QUESTS_BAR,questId",
            predicate: () => getQuestifySettings().disableAccountPanelPromo || !getQuestifySettings().disableAccountPanelQuestProgress,
            replacement: {
                match: /(?<=function\(\){)(let (\i)=\(0,\i.\i\)\(\);)/,
                replace: "void $self.useQuestRerender();$1$2=$self.getQuestPanelOverride($2);"
            }
        },
        {
            // Prevents fetching Quests.
            find: 'type:"QUESTS_FETCH_CURRENT_QUESTS_BEGIN"',
            group: true,
            predicate: () => getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    // QUESTS_FETCH_CURRENT_QUESTS_BEGIN
                    match: /(?=if\(!\i.\i.isFetchingCurrentQuests\))/,
                    replace: "return;"
                },
                {
                    // QUESTS_FETCH_QUEST_TO_DELIVER_BEGIN
                    match: /(?=let.{0,150}QUESTS_FETCH_QUEST_TO_DELIVER_BEGIN)/,
                    replace: "return;"
                }
            ]
        },
        {
            // Fixes the progress tracking for Quests.
            find: ",{progressTextAnimation:",
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: {
                match: /(let{percentComplete:.{0,115}?children:\i}=)(\i)/,
                replace: "const questifyProgress=$self.getQuestPanelPercentComplete({...$2,quest:$2.children?.props?.quest});$1Object.assign({},$2,questifyProgress??{})"
            }
        },
        {
            // Overrides the title and subtitle to provide more useful information for Quests being completed.
            find: '"progress-title"',
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: {
                match: /(?<={quest:(\i).{0,250}?return.{0,150}?,percentComplete:\i.{0,280}?"progress-title",children.{0,115}?children:)(\i.{0,50}"progress-subtitle",isTextTransition:!0,children.{0,115}?children:)/,
                replace: "$self.normalizeQuestName($1)??$2$self.getQuestPanelSubtitleText($1)??"
            }
        },
        {
            // Formats the Orbs balance on the Quests page with locale string formatting.
            find: '("BalanceCounter")',
            predicate: () => !getQuestifySettings().disableQuestsEverything,
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
            // Removes stack traces from Quest auto-complete network actions and marks both patches as healthy.
            find: "NetworkActionNames.QUEST_VIDEO_PROGRESS,",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything && hasEnabledAutoCompleteQuestTypes(),
            replacement: [
                {
                    match: /(async function \i\(\i,\i\)\{await \i\.\i\.post\(\{url:\i\.\i\.QUESTS_VIDEO_PROGRESS.{0,200}?stack_trace:)Error\(\)\.stack\?\?""/,
                    replace: '$self.setVideoProgressStackTracePatchSucceeded();$1""'
                },
                {
                    match: /(async function \i\(\i\)\{let\{questId:\i,streamKey:\i.{0,350}?stack_trace:)Error\(\)\.stack\?\?""/,
                    replace: '$self.setHeartbeatStackTracePatchSucceeded();$1""'
                }
            ]
        },
        {
            find: "QUEST_HOME)},[]),",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    // Subscribes the Quest page sort/filter state to Questify rerenders.
                    match: /(let \i,\i,\i,\i,\i=\i\.useRef\(null\),)/,
                    replace: "$1questRerenderTrigger=$self.useQuestRerender(),"
                },
                {
                    // Set the initial sort method.
                    match: /(\i.\i.SUGGESTED)/,
                    replace: "$self.getLastSortChoice()??$1"
                },
                {
                    // Set the initial filters and update the filters and sort method when they change.
                    match: /(get\(\i\)\)\?\?)(\i,\[)(\i)(\]\),\i=\i.useCallback\((\i)=>{)(.{0,60}?useCallback\((\i)=>{)/,
                    replace: "$1$self.getLastFilterChoices()??$2$3,questRerenderTrigger$4$self.setLastSortChoice($5);$6$self.setLastFilterChoices($7);$self.rerenderQuests();"
                },
                {
                    // Update the last used sort and filter choices when the toggle setting for either is changed.
                    match: /(?<=ALL,\i.useMemo\(\(\)=>\()({sortMethod:(\i),filters:(\i))/,
                    replace: "$self.setLastSortChoice($2),$self.setLastFilterChoices($3),$1"
                }
            ]
        },
        {
            find: "config.taskConfigV2.tasks).length)return",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything && hasEnabledAutoCompleteQuestTypes(),
            replacement: [
                {
                    // Overwrite button props for UNENROLLED Quests.
                    match: /(?<=onClick:(\(\)=>{.[^}]+}),text:(\i),icon:\i,fullWidth:!0)/,
                    replace: ",...($self.getQuestButtonProps(arguments[0])??{})"
                },
                {
                    // Overwrite button props for ENROLLED/INCOMPLETE Quests.
                    match: /(?<=let{quest:\i,taskType:\i,surface:\i.{0,150}?size:\i}=\i;return)(.{0,300}?taskType:\i,size:\i,analyticsCtxQuestContent:\i,analyticsCtxSourceQuestContent:\i}\))/,
                    replace: " $self.enrolledIncompleteButton(arguments[0])||($1)"
                }
            ]
        },
        {
            // Overwrite button props for Quest bar.
            find: "QUESTS_BAR,questId",
            predicate: () => !getQuestifySettings().disableQuestsEverything && hasEnabledAutoCompleteQuestTypes(),
            replacement: {
                match: /(?<=SELECT&&!\i&&!\i,(\i)=null;)(return )(\i\?\i=\(0,\i.\i\)\(\i,{quest:(\i))/,
                replace: "const questifyButton=$self.enrolledIncompleteButton({quest:$4});$2questifyButton?$1=questifyButton:$3"
            }
        },
        {
            // Keeps Questify completion progress visible when Discord marks the native Quest bar dismissed.
            find: "prevIsQuestAccepted:",
            predicate: () => !getQuestifySettings().disableQuestsEverything && !getQuestifySettings().disableAccountPanelQuestProgress,
            replacement: {
                match: /(?<=isLoading:\i}=\(0,\i.\i\)\(\),\i=\i\.useContext\(\i\.\i\)\|\|\i&&)(\i)/,
                replace: "($1||$self.shouldForceQuestPanelVisible(arguments[0].quest))"
            }
        },
        {
            find: ".rowIndex,trackGuildAndChannelMetadata",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    // Prevent the platform selector if the Quest is auto-completable.
                    match: /(?<=ACCEPTED,\i=)(?=\i&&)/,
                    replace: "!$self.canAutoCompleteQuest(arguments[0].quest)&&"
                },
                {
                    // Prevent the platform selector if the Quest is auto-completable.
                    match: /(?<=SELECT,\i=)(?=\i&&)/,
                    replace: "!$self.canAutoCompleteQuest(arguments[0].quest)&&"
                },
                // If this group becomes unruly due to Discord refactoring and is unfixable,
                // the 2nd, 3rd, and 4th can be commented out in favor of just the 1st at the
                // expense of not seeing CTA buttons on completed but unclaimed Quests.
                {
                    // Always expose the CTA button when available instead of only for videos and activities.
                    match: /(?<=wrap:!1,children:\[)\i&&[^?]+/,
                    replace: "!!arguments[0].quest.config.ctaConfig"
                },
                {
                    // Let completed/claimed expired Quests with CTAs use the CTA-aware completed branch.
                    match: /(?<=return\()(?=\i.enabled&&\i===\i\.\i\.EXPIRED_CLAIMABLE&&\i\.\i\.has\(\i\))/,
                    replace: "!arguments[0].quest.config.ctaConfig&&"
                },
                {
                    // Let completed/claimed expired Quests with CTAs use the CTA-aware completed branch.
                    match: /(?<=\):\i\?\i=)(\i)(?=\?\(0,\i\.jsx\)\(\i,\{quest:\i,sourceQuestContent:\i,onClick:\i,text:\i\}\):\(0,\i\.\i\)\(\i\)\?)/,
                    replace: "arguments[0].quest.config.ctaConfig||$1"
                },
                {
                    // Force the CTA-aware complete branch.
                    match: /(?<=analyticsCtxQuestContentRowIndex:\i}\)}\):\i&&\i)(.{0,200}?fullWidth:!0}\)}\):)(\i.enabled)(.{0,50}?CLAIMED\))&&\i.\i.has\(\i\)(\?\i=)\i/,
                    replace: "&&false$1arguments[0].quest.config.ctaConfig&&arguments[0].quest.userStatus?.completedAt&&($2||true)$3$4true"
                }
            ]
        },
        {
            find: ".rowIndex,trackGuildAndChannelMetadata",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    // Subscribes each Quest tile to Questify's manual rerender trigger.
                    match: /(?=return\(0,\i\.\i\)\("div",\{id:)/,
                    replace: "void $self.useQuestRerender();"
                },
                {
                    // Adds Questify tile classes and inline CSS variables.
                    match: /(?<=className:)(\i\(\)\(\i\.\i,\i\))(?=,onMouseEnter)/,
                    replace: "$self.getQuestTileClasses($1,arguments[0].quest),style:$self.getQuestTileStyle(arguments[0].quest)"
                },
                {
                    // Skips the reward placeholder when assets are preloaded.
                    match: /(?<=showPlaceholder:)(!\i)(?=,width)/g,
                    replace: "$self.shouldPreloadQuestAssets()?!1:$1"
                },
                {
                    // Disables lazy loading for Quest art when preloading is enabled.
                    match: /(?<=onLoadComplete:\i,lazyLoad:)!0/g,
                    replace: "$self.shouldPreloadQuestAssets()?!1:!0"
                },
                {
                    // Treats the banner & reward content as visible so it loads immediately when preloading.
                    match: /(?<=isVisibleInViewport:)(\i)(?=,sourceQuestContent:\i\}\))/g,
                    replace: "$self.shouldPreloadQuestAssets()?true:$1"
                }
            ]
        },
        {
            // Adds the Questify sort option to Discord's Quest sort enum.
            find: "SUGGESTED=\"suggested\",",
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: {
                match: /(?<=\(\((\i)=\{\}\))(?=\.SUGGESTED="suggested",)/,
                replace: ".QUESTIFY=\"questify\",$1"
            }
        },
        {
            // Labels the injected Questify sort option in the dropdown.
            find: "has no rewards configured`",
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: {
                match: /(?=case (\i\.\i)\.SUGGESTED)/,
                replace: "case $1.QUESTIFY:return\"Questify\";"
            },
        },
        {
            find: "CLAIMED=\"claimed\",",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    // Runs Questify sorting in the hook-safe Quest list path and tracks manual rerenders.
                    match: /,(\i)=new Map\((\i)\.map/,
                    replace: ";const questRerenderTrigger=$self.useQuestRerender();const questifySorted=$self.sortQuests($2,arguments[1]?.sortMethod!==\"questify\");let $1=new Map($2.map"
                },
                {
                    // Replaces Discord's filtered Quest list with Questify's order only when selected.
                    match: /(?=if\(0===(\i)\.length\)return\[\];if\(\i\.current\.length>0)/,
                    replace: "if(arguments[1]?.sortMethod===\"questify\"){$1=questifySorted;};"
                },
                {
                    // Bypasses Discord's memo cache while the Questify sort is active.
                    match: /(if\(\i\.current\.length>0&&\i\.current===\i\.length&&\i\.current===\i\.sortMethod&&\i\.current===\i\.filters&&\i\.current===\i)(\)return \i\.current;)/,
                    replace: "$1&&arguments[1]?.sortMethod!==\"questify\"$2"
                },
                {
                    // If we already applied Questify's sort, skip further sorting.
                    match: /(?<=\{sortMethod:(\i).{0,750}?return )((\i).sort)/,
                    replace: "$1===\"questify\"?$3:$2"
                },
                {
                    // Recomputes Discord's Quest list memo when Questify settings or rerenders change.
                    match: /(?<=\.id\);return \i\.current=\i,\i\.current=\i\.sortMethod,\i\.current=\i\.filters,\i\.current=\i\.length,\i\.current=\i,\i\},\[)(\i,\i,\i)(?=\]\)\))/,
                    replace: "$1,questRerenderTrigger,questifySorted"
                }
            ]
        },
        {
            // Sorts the "Claimed Quests" tabs.
            find: ".ALL)}):(",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(return \i&&0===\i.length.{0,150}?children:)\[\.\.\.(\i).{0,100}?claimedAt\?\?""\)\)/,
                    replace: "const questifySorted=$self.sortQuests($2);$1questifySorted"
                },
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
                    // Makes use of the custom prop if provided by using custom logic for negatives and
                    // truncation. If the prop is not provided, assume default behavior for native badges.
                    match: /(?<=function \i\((\i))(\){return )(\i<1e3.{0,60}?k\+`)/,
                    replace: ",maxDigits$2maxDigits===undefined?($3):$self.formatLowerBadge($1,maxDigits)[0]"
                }
            ]
        },
    ],

    flux: {
        CHANNEL_SELECT() { setOnQuestsPage(); },

        QUESTS_FETCH_CURRENT_QUESTS_SUCCESS(data: { quests: Quest[]; }): void {
            setInitialQuestDataFetched(true);
            QL.log("QUESTS_FETCH_CURRENT_QUESTS_SUCCESS", data);
            validateIgnoredQuests(data.quests);
            resumeAutoCompletesIfReady();
        },

        QUESTS_ENROLL_SUCCESS(data: any): void {
            QL.log("QUESTS_ENROLL_SUCCESS", data);
            validateIgnoredQuests();
        },

        QUESTS_CLAIM_REWARD_SUCCESS(data: any): void {
            QL.log("QUESTS_CLAIM_REWARD_SUCCESS", data);
            validateIgnoredQuests();
        },

        QUESTS_USER_STATUS_UPDATE(data: any): void {
            QL.log("QUESTS_USER_STATUS_UPDATE", data);

            const userStatus = snakeToCamel(data).userStatus as QuestUserStatus | undefined;
            const claimedAt = !!userStatus?.claimedAt;
            const completedRecently = userStatus?.completedAt
                ? Date.now() - new Date(userStatus.completedAt).getTime() <= 5000
                : false;

            validateIgnoredQuests();

            if (completedRecently && !claimedAt && !notifiedCompletedQuests.has(userStatus!.questId)) {
                notifiedCompletedQuests.add(userStatus!.questId);

                if (getQuestifySettings().notifyOnQuestComplete) {
                    notifyQuestCompletion(QuestStore.getQuest(userStatus!.questId));
                }

                if (getQuestifySettings().questCompletedAlertSound) {
                    AudioPlayer(
                        getQuestifySettings().questCompletedAlertSound,
                        Math.max(0, Math.min(100, getQuestifySettings().questCompletedAlertVolume)) / 100
                    ).play();
                }
            }
        },

        USER_SETTINGS_MODAL_OPEN(): void {
            setSettingsModalOpen(true);
        },

        USER_SETTINGS_MODAL_CLOSE(): void {
            setSettingsModalOpen(false);
            promptToRestartIfDirty();
        },

        LOGIN_SUCCESS(): void {
            if (!isSwitchingAccount || getQuestifySettings().disableQuestsEverything) {
                return;
            } else {
                isSwitchingAccount = false;
            }

            setInitialQuestDataFetched(false);
            didAttemptAutoCompleteResume = false;
            startPerAccountTasks("LOGIN_SUCCESS");
        },

        LOGOUT(data: { isSwitchingAccount?: boolean; }): void {
            if (!data.isSwitchingAccount) {
                return;
            } else {
                isSwitchingAccount = true;
            }

            setInitialQuestDataFetched(false);
            stopPerAccountTasks("LOGOUT");
        },

        RUNNING_GAMES_CHANGE(data: { games: { id: string; }[]; }): void {
            stopAutoCompletesForRunningGames(data.games.map(game => game.id));
        }
    },

    contextMenus: {
        "quests-entry": QuestTileContextMenu,
    },

    renderQuestifyButton: ErrorBoundary.wrap(QuestButton, { noop: true }),

    start() {
        initializeRestartTracking(settings);
        addServerListElement(ServerListRenderPosition.Above, this.renderQuestifyButton);

        onceReady.then(() => {
            if (!getQuestifySettings().disableQuestsEverything) {
                startPerAccountTasks("PLUGIN_START");
            } else {
                removeServerListElement(ServerListRenderPosition.Above, this.renderQuestifyButton);
            }
        });
    },

    stop() {
        const pluginEnabled = Settings.plugins.Questify?.enabled;

        disposeRestartTracking();
        removeServerListElement(ServerListRenderPosition.Above, this.renderQuestifyButton);
        stopPerAccountTasks("PLUGIN_STOP", pluginEnabled);

        if (!pluginEnabled) {
            resetQuestsToResume();
        }
    }
});
