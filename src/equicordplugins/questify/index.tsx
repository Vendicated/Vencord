/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { playAudio } from "@api/AudioPlayer";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { PlainSettings, Settings } from "@api/Settings";
import { ErrorBoundary } from "@components/index";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import type { Quest, QuestUserStatus } from "@vencord/discord-types";
import { findComponentByCodeLazy, onceReady } from "@webpack";
import { QuestStore } from "@webpack/common";
import type { JSX } from "react";

import { disguiseHomeButton, QuestButton, showQuestButton } from "./components/questButton";
import { QuestTileContextMenu } from "./components/questTileContextMenu";
import { getCurrentUserId, getQuestifySettings } from "./settings/access";
import { disposeQuestAutomation, initializeQuestAutomation, processAutomaticQuests } from "./settings/automation";
import { resetQuestsToResume, startAutoFetchingQuests, stopAutoFetchingQuests } from "./settings/fetching";
import { validateIgnoredQuests } from "./settings/ignoredQuests";
import { showPendingQuestifyNotice } from "./settings/notices";
import { rerenderQuests, useQuestRerender } from "./settings/rerender";
import { disposeRestartTracking, initializeRestartTracking, promptToRestartIfDirty, setRestartDirty } from "./settings/restartTracking";
import { settings } from "./settings/store";
import { getSettingsModalOpen, initialQuestDataFetched, setInitialQuestDataFetched, setSettingsModalOpen } from "./state";
import managedStyle from "./styles.css?managed";
import { canAutoCompleteQuest, getActiveAutoCompletes, getQuestAutoCompleteProgress, getQuestButtonProps, getQuestPanelSubtitleText, getQuestProcessingBatches, hasEnabledAutoCompleteQuestTypes, processQuestForAutoComplete, resumeInterruptedAutoCompletes, setHeartbeatStackTracePatchSucceeded, setVideoProgressStackTracePatchSucceeded, stopAllAutoCompletes, stopAutoCompletesForRunningGames, stopQuestAutoComplete } from "./utils/completion";
import { canOpenDevToolsWindow, fetchAndDispatchQuests, openDevToolsWindow, snakeToCamel } from "./utils/fetching";
import { normalizeQuestName } from "./utils/filtering";
import { notifyQuestCompletion, QL } from "./utils/logging";
import { getQuestEmbedProgress, getQuestPanelOverride, getQuestPanelPercentComplete, shouldForceQuestPanelVisible } from "./utils/questState";
import { getLastFilterChoices, getLastSortChoice, getQuestTileClasses, getQuestTileStyle, setLastFilterChoices, setLastSortChoice, shouldPreloadQuestAssets, sortQuests } from "./utils/questTiles";
import { formatLowerBadge, QUEST_PAGE } from "./utils/ui";

let isPluginStarted = false;
let activeAccountUserId: string | null = null;
let accountSessionGeneration = 0;
let didAttemptAutoCompleteResume = false;
const notifiedCompletedQuests = new Set<string>();
export const enabledOnStartup = PlainSettings.plugins.Questify?.enabled;

function createQuestEnrollmentGuard(): () => boolean {
    const userId = getCurrentUserId();
    const generation = accountSessionGeneration;

    return () => userId !== null && getCurrentUserId() === userId && accountSessionGeneration === generation;
}

function setOnQuestsPage(force?: boolean): void {
    getQuestifySettings().isOnQuestsPage = force ?? (window.location.pathname === QUEST_PAGE);
}

function startPerAccountTasks(source: string): void {
    const userId = getCurrentUserId();

    if (!isPluginStarted || getQuestifySettings().disableQuestsEverything || !userId || activeAccountUserId === userId) {
        return;
    }

    if (activeAccountUserId) {
        accountSessionGeneration++;
        stopPerAccountTasks("ACCOUNT_CHANGE");
    }

    setInitialQuestDataFetched(false);
    didAttemptAutoCompleteResume = false;
    const startedAt = Date.now();

    setOnQuestsPage();
    initializeQuestAutomation();
    startAutoFetchingQuests();
    fetchAndDispatchQuests();
    activeAccountUserId = userId;

    QL.info(`START_TASKS-${source.toUpperCase()}`, { startedAt });
}

function stopPerAccountTasks(source: string, preserveResume: boolean = true): void {
    const stoppedAt = Date.now();

    setOnQuestsPage();
    disposeQuestAutomation();
    stopAutoFetchingQuests();
    notifiedCompletedQuests.clear();
    stopAllAutoCompletes({ manual: false, preserveResume, terminalHeartbeat: true, userId: activeAccountUserId });
    activeAccountUserId = null;

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

function wrapOrbsBalance(balance: String): JSX.Element {
    return (<span style={{ fontSize: "90%" }}>{balance}</span>);
}

export default definePlugin({
    name: "Questify",
    description: "Enhance specific Quest features, disable annoyances, or completely remove Quests.",
    tags: ["Appearance", "Customisation", "Privacy", "Utility"],
    authors: [EquicordDevs.Etorix],
    dependencies: ["AudioPlayerAPI", "ServerListAPI"],
    startAt: StartAt.Init, // Needed in order to beat Read All Messages to inserting above the server list.
    managedStyle,
    settings,

    canOpenDevToolsWindow,
    canAutoCompleteQuest,
    createQuestEnrollmentGuard,
    disguiseHomeButton,
    enrolledIncompleteButton,
    formatLowerBadge,
    getActiveAutoCompletes,
    getQuestProcessingBatches,
    getLastFilterChoices,
    getLastSortChoice,
    getQuestAutoCompleteProgress,
    getQuestEmbedProgress,
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
    wrapOrbsBalance,

    patches: [
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
                match: /(?<=\i\.\i\(\i,\{)(?=\i:\(\)=>\i.{0,30000}?let (\i)=function\(\i\)\{let\{ref:)/,
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
                match: /,hasQuest:(?=\i=!1)/,
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
                    match: /GLOBAL_DISCOVERY_TABS/g,
                    replace: '$&.filter(tab=>tab!=="quests")'
                }
            ]
        },
        {
            // Hides Quests tab in the DMs tab list.
            find: '.QUEST_HOME)},"quests")',
            predicate: () => getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(?<="family-center"\)(?:&&undefined)?:null,)/,
                    replace: "null&&"
                }
            ]
        },
        {
            // Hides the sponsored banner on the Quests page.
            find: "QUEST_HOME)},[]),",
            predicate: () => !getQuestifySettings().disableQuestsEverything && getQuestifySettings().disableSponsoredBanner,
            replacement: {
                match: /(?<=,{questHomeHero:(\i),isLoading:(\i),confirmedEmpty:(\i)}=.{0,300}?ORBS_BALANCE_MENU}\)},\[\]\);)/,
                replace: "$1=null;$2=false;$3=true;"
            }
        },
        {
            // Hides the Quest & Orbs badges on user profiles.
            find: ".MODAL]:26",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything && getQuestifySettings().disableOrbsAndQuestsBadges,
            replacement: [
                {
                    match: /(,{badges:\i)(?=,overflowCount:\i,displayProfile:\i)/,
                    replace: '$1.filter(badge=>!["quest_completed","orb_profile_badge"].includes(badge.id))',
                }
            ]
        },
        {
            // Overrides the account panel Quest popup and progress display.
            find: "collapsed-with-rewards\":\"collapsed-without-rewards",
            predicate: () => getQuestifySettings().disableAccountPanelPromo || !getQuestifySettings().disableAccountPanelQuestProgress,
            replacement: {
                match: /(?<=function\(\)\{)(let (\i)=\(0,\i\.\i\)\(\),\i=\(0,\i\.\i\)\(.{0,55}?\);)(?=switch\(\2\.type\)\{case (\i\.\i\.QUEST):)/,
                replace: "void $self.useQuestRerender();$1$2=$self.getQuestPanelOverride($2,$3);if(null==$2)return null;"
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
                    match: /(?<=if\(\i.\i.isFetchingCurrentQuests)/,
                    replace: "||true"
                },
                {
                    // QUESTS_FETCH_QUEST_TO_DELIVER_BEGIN
                    match: /(?=let \i=Date.now\(\);\i.recordQuestRequestAttempt.{0,50}QUESTS_FETCH_QUEST_TO_DELIVER_BEGIN)/,
                    replace: "return;"
                }
            ]
        },
        {
            // Fixes the progress tracking for Quests.
            find: ",{progressTextAnimation:",
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: {
                match: /(let{percentComplete:[^}]+}=)(\i)/,
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
            // Formats the Orbs balance in the default balance counter on the Quests page with locale string formatting.
            find: '("BalanceCounter")',
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(`\${(\i).toFixed\(0\)}`.length)/,
                    replace: "$1+($2>=1e6?0.8:$2>=1e3?0.4:0)"
                },
                {
                    match: /(?<=children:\i.to\(\i=>`\${\i).toFixed\(0\)/,
                    replace: ".toLocaleString(undefined,{maximumFractionDigits:0})"
                }
            ]
        },
        {
            // Formats the Orbs balance in the balance popout on the Quests page with locale string formatting.
            find: 'location:"BalanceWidgetMenu"',
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    match: /(?<=children:)(\i\?\?0)/,
                    replace: "$self.wrapOrbsBalance(($1).toLocaleString(undefined,{maximumFractionDigits:0}))"
                }
            ]
        },
        {
            // Guards enrollment results across account changes and exposes native errors.
            find: 'type:"QUESTS_ENROLL_BEGIN",',
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    match: /\i\.\i\.dispatch\(\{type:"QUESTS_ENROLL_BEGIN",questId:\i\}\);/,
                    replace: "const questifyEnrollmentIsCurrent=$self.createQuestEnrollmentGuard();$&"
                },
                {
                    match: /(?=return \i\.\i\.dispatch\(\{type:"QUESTS_ENROLL_SUCCESS",)/,
                    replace: 'if(!questifyEnrollmentIsCurrent())return{type:"cancelled"};'
                },
                {
                    match: /catch\{(return \i\.\i\.dispatch\(\{type:"QUESTS_ENROLL_FAILURE",questId:\i\}\),\{type:"unknown_error")/,
                    replace: 'catch(error){if(!questifyEnrollmentIsCurrent())return{type:"cancelled"};$1,error'
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
                    match: /(async function \i\(\i,\i\)\{await \i\.\i\.post\(\{url:\i\.\i\.QUESTS_VIDEO_PROGRESS.{0,250}?stack_trace:)Error\(\)\.stack\?\?""/,
                    replace: '$self.setVideoProgressStackTracePatchSucceeded();$1""'
                },
                {
                    match: /(async function \i\(\i\)\{let\{questId:\i,streamKey:\i.{0,450}?stack_trace:)Error\(\)\.stack\?\?""/,
                    replace: '$self.setHeartbeatStackTracePatchSucceeded();$1""'
                }
            ]
        },
        {
            // Prevent Video Quests from pausing on lost focus.
            find: "[QV] | Pausing video | playerState:",
            predicate: () => !getQuestifySettings().disableQuestsEverything && getQuestifySettings().preventVideoQuestsPausing,
            replacement: {
                match: /(?<=setCaptionEnabled\),)({focused:)(\i)/,
                replace: "$2=true,$1questifyFocused"
            }
        },
        {
            // Prevent Video Quests from pausing on lost focus.
            find: ",listenForHlsErrors:!1",
            predicate: () => !getQuestifySettings().disableQuestsEverything && getQuestifySettings().preventVideoQuestsPausing,
            replacement: {
                match: /(?<=pauseOnLostVisibility:)!\i/,
                replace: "false",
            }
        },
        {
            find: "QUEST_HOME)},[]),",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    // Subscribes the Quest page sort/filter state to Questify rerenders.
                    match: /(\{ref:\i,\.\.\.\i\}=\i,\i=\i\.useRef\(null\),)(?=\[\i,\i\]=)/,
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
                    match: /(?<=,text:\i,icon:\i,iconPosition:\i,fullWidth:!0)(?=,"aria-disabled":\i\|\|void 0)/,
                    replace: ",...($self.getQuestButtonProps(arguments[0])??{})"
                },
                {
                    // Overwrite button props for ENROLLED/INCOMPLETE Quests.
                    match: /(case \i\.\i\.(?:ENROLLED|INCOMPLETE):return)(?=\(0,\i\.jsx\)\(\i,\{quest:(\i),taskType:\i(?:\.type)?,size:(\i),)/g,
                    replace: "$1 $self.enrolledIncompleteButton({quest:$2,size:$3})||"
                }
            ]
        },
        {
            // Overwrite button props for Quest bar.
            find: "collapsed-with-rewards\":\"collapsed-without-rewards",
            predicate: () => !getQuestifySettings().disableQuestsEverything && hasEnabledAutoCompleteQuestTypes(),
            replacement: {
                match: /(?<=SELECT&&!\i&&!\i,(\i)=null;)(return )(\i\?\i=\(0,\i.\i\)\(\i,{quest:(\i))/,
                replace: "const questifyButton=$self.enrolledIncompleteButton({quest:$4,size:\"sm\"});$2questifyButton?$1=questifyButton:$3"
            }
        },
        {
            // Keeps Questify completion progress visible when Discord marks the native Quest bar dismissed.
            find: "handleGameSheetOpened:",
            predicate: () => !getQuestifySettings().disableQuestsEverything && !getQuestifySettings().disableAccountPanelQuestProgress,
            replacement: {
                match: /(?<=isLoading:\i}=\(0,\i\.\i\)\(\),\i=\i\.useContext\(\i\.\i\),\i=\i\|\|\i&&)(\i)/,
                replace: "($1||$self.shouldForceQuestPanelVisible(arguments[0].quest))"
            }
        },
        {
            find: "questNameHeadingId",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    // Prefer the auto-complete CTA over the console platform selector.
                    match: /(\i===\i\.\i\.ENROLLED&&)(?=\(0,\i\.\i\)\((\i)\))/,
                    replace: "$1!$self.canAutoCompleteQuest($2)&&"
                },
                {
                    // Prefer the auto-complete CTA over the desktop-only external-link row.
                    match: /(\(\i===\i\.\i\.ENROLLED\|\|\i===\i\.\i\.INCOMPLETE\)&&)(?=\(0,\i\.\i\)\((\i)\))/,
                    replace: "$1!$self.canAutoCompleteQuest($2)&&"
                },
                {
                    // Let completed/claimed Quests with CTAs use the generalized CTA row.
                    match: /(\(\i===\i\.\i\.COMPLETED\|\|\i===\i\.\i\.CLAIMED\)&&)(?=\(0,\i\.\i\)\((\i)\))/,
                    replace: "$1!$2.config.ctaConfig&&"
                },
                {
                    // Always expose the external CTA when the Quest has one configured.
                    match: /(?<=wrap:!1,children:\[)(\i)(?=&&\(0,\i\.jsx\)\(\i,\{quest:(\i))/,
                    replace: "($2.config.ctaConfig||$1)"
                }
            ]
        },
        {
            find: 'STEP_2_CLICKED_INTERNAL,"quest_embed_card_footer',
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    // Subscribes each Quest message embed to Questify's manual rerender trigger.
                    match: /(?<=function \i\(\i\){)(?=let\{quest:\i,location:\i,questContentPosition:\i,sourceQuestContent:)/,
                    replace: "void $self.useQuestRerender();"
                },
                {
                    // Overrides the progress tracking for Quest embeds.
                    match: /(?<=\{completedRatio:\i,completedRatioDisplay:\i\}=)(\(0,\i\.\i\)\((\i)\))/,
                    replace: "Object.assign({},$1,$self.getQuestEmbedProgress($2)??{})"
                },
                {
                    // Adds Questify tile classes and inline CSS variables.
                    match: /(?<=className:)(\i\(\)\(\i.\i,\i.\i\)(?=,onMouseEnter:\i))/,
                    replace: "$self.getQuestTileClasses($1,arguments[0].quest),style:$self.getQuestTileStyle(arguments[0].quest)"
                }
            ]
        },
        {
            find: "questNameHeadingId",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: [
                {
                    // Subscribes each Quest tile to Questify's manual rerender trigger.
                    match: /(?=return\(0,\i\.\i\)\("article",\{id:)/,
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
            find: "EXPIRING_SOON=\"expiring_soon\"",
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
                    // Applies Questify filtering and sorting before Discord's Quest list hooks.
                    match: /,(\i)=new Map\((\i)\.map/,
                    replace: ";const questRerenderTrigger=$self.useQuestRerender();const questifySorted=$self.sortQuests($2,arguments[1]?.sortMethod!==\"questify\");const questifyListChanged=questifySorted!==$2;$2=questifySorted;let $1=new Map($2.map"
                },
                {
                    // Bypasses Discord's memo cache when Questify changes the list.
                    match: /(?<=if\()(?=\i\.current\.length>0&&\i\.current===)/,
                    replace: "!questifyListChanged&&"
                },
                {
                    // Bypasses the claimed Quest cache when Questify changes the list.
                    match: /(?<=if\()(?=\i\.current\.length>0&&\i\.current\.length===)/,
                    replace: "!questifyListChanged&&"
                },
                {
                    // If we already applied Questify's sort, skip further sorting.
                    match: /(?<=\{sortMethod:(\i).{0,800}?return )((\i).sort)/,
                    replace: "$1===\"questify\"?$3:$2"
                },
                {
                    // Recomputes Discord's Quest list memo when Questify settings or rerenders change.
                    match: /(?=]\)\),\i=\(\i=\i.useMemo\(\(\)=>\i.filter)/,
                    replace: ",questRerenderTrigger,questifySorted"
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
            // Allow non-shareable Quests to embed in chat and to have
            // their share URLs copyable from the embed context menu.
            find: "NOT_SHAREABLE}function",
            group: true,
            predicate: () => !getQuestifySettings().disableQuestsEverything,
            replacement: {
                match: /(?<=return )(?=\i.sharePolicy!==\i.\i.NOT_SHAREABLE)/,
                replace: "true||"
            }
        },
        {
            // Adds a maxDigits prop to the LowerBadge component which allows for not truncating, or for truncating at a specific threshold.
            find: ".BADGE_NOTIFICATION_BACKGROUND.css,disableColor",
            group: true,
            replacement: [
                {
                    // Extracts the custom maxDigits prop.
                    match: /(\(\i\){let{count:\i,)/,
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
            processAutomaticQuests(data.quests);
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
                    playAudio(
                        getQuestifySettings().questCompletedAlertSound,
                        { volume: Math.max(0, Math.min(100, getQuestifySettings().questCompletedAlertVolume)) }
                    );
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

        CONNECTION_OPEN(): void {
            startPerAccountTasks("CONNECTION_OPEN");
        },

        async CURRENT_USER_UPDATE(): Promise<void> {
            await onceReady;
            startPerAccountTasks("CURRENT_USER_UPDATE");
        },

        LOGIN_SUCCESS(): void {
            startPerAccountTasks("LOGIN_SUCCESS");
        },

        LOGOUT(): void {
            accountSessionGeneration++;
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
        isPluginStarted = true;

        if (!enabledOnStartup && PlainSettings.plugins.Questify?.enabled) {
            setRestartDirty(true);
        }

        initializeRestartTracking(settings);

        if (enabledOnStartup) {
            addServerListElement(ServerListRenderPosition.Above, this.renderQuestifyButton);
        }

        onceReady.then(() => {
            if (!isPluginStarted) {
                return;
            }

            showPendingQuestifyNotice();

            if (!getQuestifySettings().disableQuestsEverything) {
                startPerAccountTasks("PLUGIN_START");
            } else {
                removeServerListElement(ServerListRenderPosition.Above, this.renderQuestifyButton);
            }
        });
    },

    stop() {
        isPluginStarted = false;

        const pluginEnabled = Settings.plugins.Questify?.enabled;
        const userId = activeAccountUserId ?? getCurrentUserId();

        disposeRestartTracking();
        removeServerListElement(ServerListRenderPosition.Above, this.renderQuestifyButton);
        stopPerAccountTasks("PLUGIN_STOP", pluginEnabled);

        if (!pluginEnabled && userId) {
            resetQuestsToResume(undefined, userId);
        }
    }
});
