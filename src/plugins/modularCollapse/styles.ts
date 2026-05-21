/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PANEL_COUNT } from "./constants";
import { addStyle, removeStyle } from "./cssHelper";
import * as el from "./elements";
import * as m from "./modules";
import { getSettings } from "./settings";

const NAME = "ModularCollapse";

// ─── Root & Variable Styles ───

export function initRootStyles(): void {
    const s = getSettings();
    addStyle("root", `
        :root {
            --fst-server-list-collapsed: 0;
        }
        ::-webkit-scrollbar {
            width: 0px;
            background: transparent;
        }
        .cui-toolbar {
            align-items: right;
            display: flex;
            gap: var(--space-xs);
            transition: gap var(--cui-transition-speed) !important;
        }
        .${m.icons?.iconWrapper}.${m.icons?.selected}:not([id*="cui"]):has([d="M14.5 8a3 3 0 1 0-2.7-4.3c-.2.4.06.86.44 1.12a5 5 0 0 1 2.14 3.08c.01.06.06.1.12.1ZM18.44 17.27c.15.43.54.73 1 .73h1.06c.83 0 1.5-.67 1.5-1.5a7.5 7.5 0 0 0-6.5-7.43c-.55-.08-.99.38-1.1.92-.06.3-.15.6-.26.87-.23.58-.05 1.3.47 1.63a9.53 9.53 0 0 1 3.83 4.78ZM12.5 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2 20.5a7.5 7.5 0 0 1 15 0c0 .83-.67 1.5-1.5 1.5a.2.2 0 0 1-.2-.16c-.2-.96-.56-1.87-.88-2.54-.1-.23-.42-.15-.42.1v2.1a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2.1c0-.25-.31-.33-.42-.1-.32.67-.67 1.58-.88 2.54a.2.2 0 0 1-.2.16A1.5 1.5 0 0 1 2 20.5Z"]),
        .${m.icons?.iconWrapper}.${m.icons?.selected}:not([id*="cui"]):has([d="M23 12.38c-.02.38-.45.58-.78.4a6.97 6.97 0 0 0-6.27-.08.54.54 0 0 1-.44 0 8.97 8.97 0 0 0-11.16 3.55c-.1.15-.1.35 0 .5.37.58.8 1.13 1.28 1.61.24.24.64.15.8-.15.19-.38.39-.73.58-1.02.14-.21.43-.1.4.15l-.19 1.96c-.02.19.07.37.23.47A8.96 8.96 0 0 0 12 21a.4.4 0 0 1 .38.27c.1.33.25.65.4.95.18.34-.02.76-.4.77L12 23a11 11 0 1 1 11-10.62ZM15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"]) {
            display: none;
        }
        .${m.threads?.grid}>div:first-child,
        .${m.threads?.list}>div:first-child,
        .${m.threads?.headerRow} {
            min-width: 0px !important;
        }
        .${m.sidebar?.sidebarList} {
            container-type: unset !important;
        }
    `.replace(/\s+/g, " "));

    updateVariables();
}

export function updateVariables(): void {
    const s = getSettings();
    addStyle("vars", `
        :root {
            --cui-transition-speed: ${s.transitionSpeed}ms;
            --cui-collapse-size: ${s.collapseSize}px;
            --cui-channel-list-width: ${s.channelListWidth || s.defaultChannelListWidth}px;
            --cui-members-list-width: ${s.membersListWidth || s.defaultMembersListWidth}px;
            --cui-user-profile-width: ${s.userProfileWidth || s.defaultUserProfileWidth}px;
            --cui-search-panel-width: ${s.searchPanelWidth || s.defaultSearchPanelWidth}px;
            --cui-forum-popout-width: ${s.forumPopoutWidth || s.defaultForumPopoutWidth}px;
            --cui-activity-panel-width: ${s.activityPanelWidth || s.defaultActivityPanelWidth}px;
            --cui-forum-panel-top: ${(el.getNoChat()) ? "0px" : "var(--custom-channel-header-height)"};
            --cui-compat-hsl: 1;
        }
    `.replace(/\s+/g, " "));
}

export function clearRootStyles(): void {
    removeStyle("root");
    removeStyle("vars");
}

// ─── Panel collapse styles ───
// Each panel has: init, toggle, float, queryToggle, clear

interface PanelStyleState {
    toggled: boolean;
}

const panelStates: PanelStyleState[] = Array.from({ length: PANEL_COUNT }, () => ({ toggled: true }));

export function getPanelState(index: number): PanelStyleState {
    return panelStates[index];
}

// ─── Server List ───

function serverListInit(): void {
    const s = getSettings();
    addStyle("serverList_init", `
        :root { --cui-server-list-toggled: 1; }
        .${m.sidebar?.guilds} {
            transition: width var(--cui-transition-speed);
            border-right: calc(1px * var(--cui-channel-list-toggled)) solid var(--border-subtle) !important;
            border-top: 1px solid var(--app-border-frame) !important;
        }
        .${m.scroller?.tree} { padding-top: var(--space-xs) !important; }
        .${m.sidebar?.content} { transition: margin-top var(--cui-transition-speed); }
    `.replace(/\s+/g, " "));
}

function serverListToggleCSS(): string {
    return `
        :root { --cui-server-list-toggled: 0; }
        .${m.sidebar?.guilds} { width: var(--cui-collapse-size) !important; border: 0 !important; }
        .${m.sidebar?.content} { margin-top: 0px !important; }
    `.replace(/\s+/g, " ");
}

function serverListFloatCSS(): string {
    return `
        :root { --cui-server-list-toggled: 0; }
        .${m.sidebar?.guilds} {
            position: absolute !important; z-index: 192 !important;
            min-height: 100% !important; height: 100% !important; max-height: 100% !important;
            overflow-y: scroll !important;
        }
    `.replace(/\s+/g, " ");
}

// ─── Channel List ───

function channelListInit(): void {
    const s = getSettings();
    addStyle("channelList_init", `
        :root {
            --cui-channel-list-handle-offset: calc(var(--cui-channel-list-width) - 12px);
            --cui-channel-list-handle-transition: left var(--cui-transition-speed);
            --cui-channel-list-toggled: 1;
        }
        .${m.sidebar?.sidebarList} {
            max-width: var(--cui-channel-list-width) !important;
            width: var(--cui-channel-list-width) !important;
            min-width: var(--cui-channel-list-width) !important;
            transition: max-width var(--cui-transition-speed), width var(--cui-transition-speed), min-width var(--cui-transition-speed);
            min-height: 100% !important;
            overflow: visible !important;
            border-right: 1px solid var(--border-subtle) !important;
            border-left: none !important;
            border-radius: 0 !important;
        }
        .${m.sidebar?.sidebarList} > * { overflow: hidden !important; margin-left: 0 !important; }
        .${m.sidebar?.sidebarResizeHandle} { display: none !important; }
        .${m.sidebar?.sidebar} { overflow: visible !important; border: none !important; }
        .${m.guilds?.subtitleContainer}, .${m.guilds?.content}, .${m.social?.tabBody} { border-left: none !important; }
        .${m.channels?.channel} { max-width: 100% !important; }
        .${m.icons?.container} { border-left: 0 !important; }
        ${s.channelListWidth ? `
            .${m.sidebar?.sidebarList}:before {
                cursor: e-resize; z-index: 200; position: absolute; content: "";
                width: 16px; height: 100%; left: var(--cui-channel-list-handle-offset);
                transition: var(--cui-channel-list-handle-transition);
            }
        ` : ""}
    `.replace(/\s+/g, " "));
}

function channelListToggleCSS(): string {
    const s = getSettings();
    return `
        :root { --cui-channel-list-toggled: 0; }
        .${m.sidebar?.sidebarList} {
            max-width: var(--cui-collapse-size) !important;
            width: var(--cui-collapse-size) !important;
            min-width: var(--cui-collapse-size) !important;
        }
        ${s.channelListWidth ? `.${m.sidebar?.sidebarList}:before { left: -4px; }` : ""}
    `.replace(/\s+/g, " ");
}

function channelListFloatCSS(): string {
    return `
        .${m.sidebar?.sidebarList} {
            position: absolute !important; z-index: 190 !important;
            max-height: 100% !important; height: 100% !important;
        }
    `.replace(/\s+/g, " ");
}

// ─── Members List ───

function membersListInit(): void {
    const s = getSettings();
    addStyle("membersList_init", `
        .${m.members?.members} {
            max-width: var(--cui-members-list-width) !important;
            width: var(--cui-members-list-width) !important;
            min-width: var(--cui-members-list-width) !important;
            transition: max-width var(--cui-transition-speed), width var(--cui-transition-speed), min-width var(--cui-transition-speed), padding var(--cui-transition-speed);
            min-height: 100% !important;
        }
        .${m.members?.members} > * { width: 100% !important; }
        .${m.members?.member}, .${m.game?.container} { max-width: 100% !important; }
        ${s.membersListWidth ? `
            .${m.members?.members}:before {
                cursor: e-resize; z-index: 200; position: absolute; content: "";
                width: 16px; height: 100%; left: -4px;
            }
        ` : ""}
    `.replace(/\s+/g, " "));
}

function membersListToggleCSS(): string {
    return `
        .${m.members?.members} {
            max-width: var(--cui-collapse-size) !important;
            width: var(--cui-collapse-size) !important;
            min-width: var(--cui-collapse-size) !important;
            padding-left: 0 !important; padding-right: 0 !important;
        }
    `.replace(/\s+/g, " ");
}

function membersListFloatCSS(): string {
    return `
        .${m.members?.members} {
            position: absolute !important; z-index: 190 !important;
            max-height: 100% !important; height: 100% !important;
            right: 0 !important; border-left: 1px solid var(--border-subtle) !important;
        }
    `.replace(/\s+/g, " ");
}

// ─── User Profile ───

function userProfileInit(): void {
    const s = getSettings();
    const panelPath = `.${m.guilds?.content} .${m.panel?.outer}`;
    addStyle("userProfile_init", `
        ${panelPath} {
            max-width: var(--cui-user-profile-width) !important;
            width: var(--cui-user-profile-width) !important;
            min-width: var(--cui-user-profile-width) !important;
            transition: max-width var(--cui-transition-speed), width var(--cui-transition-speed), min-width var(--cui-transition-speed);
            min-height: 100% !important;
        }
        ${panelPath} .${m.panel?.inner} { border-left: 1px solid var(--border-subtle) !important; }
        ${panelPath} > * { width: 100% !important; }
        ${s.userProfileWidth ? `
            ${panelPath}:before {
                cursor: e-resize; z-index: 200; position: absolute; content: "";
                width: 16px; height: 100%; left: -4px;
            }
        ` : ""}
    `.replace(/\s+/g, " "));
}

function userProfileToggleCSS(): string {
    return `
        .${m.guilds?.content} .${m.panel?.outer} {
            max-width: var(--cui-collapse-size) !important;
            width: var(--cui-collapse-size) !important;
            min-width: var(--cui-collapse-size) !important;
        }
    `.replace(/\s+/g, " ");
}

function userProfileFloatCSS(): string {
    return `
        .${m.guilds?.content} .${m.panel?.outer} {
            position: absolute !important; z-index: 190 !important;
            max-height: 100% !important; height: 100% !important; right: 0 !important;
        }
    `.replace(/\s+/g, " ");
}

// ─── Message Input ───

function messageInputInit(): void {
    addStyle("messageInput_init", `
        .${m.guilds?.form} {
            max-height: calc(var(--custom-channel-textarea-text-area-max-height) + 24px) !important;
            transition: max-height var(--cui-transition-speed) !important;
        }
    `.replace(/\s+/g, " "));
}

function messageInputToggleCSS(): string {
    return `
        .${m.guilds?.form}:not(:has([data-slate-string="true"])):not(:has([data-list-id="attachments"])) {
            max-height: var(--cui-collapse-size) !important; overflow: hidden !important;
        }
    `.replace(/\s+/g, " ");
}

function messageInputFloatCSS(): string {
    return `
        .${m.guilds?.form} {
            position: absolute !important;
            filter: drop-shadow(0px 0px 2px var(--opacity-black-16));
            left: 0 !important; right: 0 !important; bottom: 0 !important;
        }
    `.replace(/\s+/g, " ");
}

// ─── Window Bar ───

function windowBarInit(): void {
    addStyle("windowBar_init", `
        .${m.frame?.bar} {
            min-height: var(--custom-app-top-bar-height) !important;
            height: var(--custom-app-top-bar-height) !important;
            max-height: var(--custom-app-top-bar-height) !important;
            transition: min-height var(--cui-transition-speed), height var(--cui-transition-speed), max-height var(--cui-transition-speed) !important;
        }
        .${m.sidebar?.base} { transition: grid-template-rows var(--cui-transition-speed) !important; }
    `.replace(/\s+/g, " "));
}

function windowBarToggleCSS(): string {
    return `
        .${m.frame?.bar} {
            overflow: hidden !important;
            min-height: var(--cui-collapse-size) !important;
            height: var(--cui-collapse-size) !important;
            max-height: var(--cui-collapse-size) !important;
            --custom-app-top-bar-height: calc(24px + var(--space-8));
        }
        .${m.sidebar?.base} { --custom-app-top-bar-height: var(--cui-collapse-size); }
    `.replace(/\s+/g, " ");
}

function windowBarFloatCSS(): string {
    return `
        .${m.frame?.bar} {
            position: absolute !important; top: 0 !important; left: 0 !important;
            right: 0 !important; background: var(--bg-base-tertiary) !important;
            z-index: 200 !important; --custom-app-top-bar-height: calc(24px + var(--space-8));
            border-bottom: 1px solid var(--app-border-frame) !important;
        }
        .${m.sidebar?.base} { --custom-app-top-bar-height: var(--cui-collapse-size); }
    `.replace(/\s+/g, " ");
}

// ─── Call Window ───

function callWindowInit(): void {
    addStyle("callWindow_init", `
        .${m.calls?.wrapper}:not(.${m.calls?.noChat}) {
            transition: min-height var(--cui-transition-speed), max-height var(--cui-transition-speed) !important;
        }
        .${m.calls?.wrapper}:not(.${m.calls?.noChat}) > .${m.calls?.callContainer} {
            border-left: none !important; border-top: none !important;
            border-bottom: 1px solid var(--border-subtle) !important;
        }
    `.replace(/\s+/g, " "));
}

function callWindowToggleCSS(): string {
    return `
        .${m.calls?.wrapper}:not(.${m.calls?.noChat}) {
            min-height: var(--cui-collapse-size) !important;
            max-height: var(--cui-collapse-size) !important;
        }
    `.replace(/\s+/g, " ");
}

// ─── User Area ───

function userAreaInit(): void {
    const s = getSettings();
    addStyle("userArea_init", `
        .${m.sidebar?.panels} {
            transition: max-height var(--cui-transition-speed), width var(--cui-transition-speed), border var(--cui-transition-speed) !important;
            max-height: ${s.userAreaMaxHeight}px !important;
            width: calc((var(--cui-channel-list-width) * var(--cui-channel-list-toggled)) + (var(--custom-guild-list-width) * var(--cui-server-list-toggled) * var(--cui-compat-hsl) * (1 - var(--fst-server-list-collapsed))) - (var(--space-xs) * 2)) !important;
            border-left-width: clamp(0px, calc(1px * ((var(--cui-server-list-toggled) * var(--cui-compat-hsl) * (1 - var(--fst-server-list-collapsed))) + var(--cui-channel-list-toggled))), 1px) !important;
            border-right-width: clamp(0px, calc(1px * ((var(--cui-server-list-toggled) * var(--cui-compat-hsl) * (1 - var(--fst-server-list-collapsed))) + var(--cui-channel-list-toggled))), 1px) !important;
            opacity: clamp(0, calc((var(--cui-server-list-toggled) * var(--cui-compat-hsl) * (1 - var(--fst-server-list-collapsed))) + var(--cui-channel-list-toggled)), 1) !important;
            z-index: 191 !important;
            overflow: hidden !important;
        }
        .${m.userAreaButtons?.actionButtons} button { padding: 0 !important; }
    `.replace(/\s+/g, " "));
}

function userAreaToggleCSS(): string {
    return `
        .${m.sidebar?.panels} {
            max-height: var(--cui-collapse-size) !important;
            border-top-width: 0px !important; border-bottom-width: 0px !important;
            overflow: hidden !important;
        }
    `.replace(/\s+/g, " ");
}

// ─── Search Panel ───

function searchPanelInit(): void {
    const s = getSettings();
    addStyle("searchPanel_init", `
        .${m.search?.searchResultsWrap} {
            max-width: var(--cui-search-panel-width) !important;
            width: var(--cui-search-panel-width) !important;
            min-width: var(--cui-search-panel-width) !important;
            transition: max-width var(--cui-transition-speed), width var(--cui-transition-speed), min-width var(--cui-transition-speed);
            overflow: visible !important;
            border-left: 1px solid var(--border-subtle) !important;
        }
        .${m.search?.searchResultsWrap} > header > div:last-child { justify-content: end !important; }
        ${s.searchPanelWidth ? `
            .${m.search?.searchResultsWrap}:before {
                cursor: e-resize; z-index: 200; position: absolute; content: "";
                width: 16px; height: 100%; left: -4px;
            }
        ` : ""}
    `.replace(/\s+/g, " "));
}

function searchPanelToggleCSS(): string {
    return `
        .${m.search?.searchResultsWrap} {
            max-width: var(--cui-collapse-size) !important;
            width: var(--cui-collapse-size) !important;
            min-width: var(--cui-collapse-size) !important;
        }
    `.replace(/\s+/g, " ");
}

function searchPanelFloatCSS(): string {
    return `
        .${m.search?.searchResultsWrap} {
            position: absolute !important; z-index: 190 !important;
            max-height: 100% !important; height: 100% !important; right: 0 !important;
        }
    `.replace(/\s+/g, " ");
}

// ─── Forum Popout ───

function forumPopoutInit(): void {
    const s = getSettings();
    addStyle("forumPopout_init", `
        .${m.popout?.chatLayerWrapper} {
            max-width: var(--cui-forum-popout-width) !important;
            width: var(--cui-forum-popout-width) !important;
            min-width: var(--cui-forum-popout-width) !important;
            transition: max-width var(--cui-transition-speed), width var(--cui-transition-speed), min-width var(--cui-transition-speed);
            position: absolute !important; z-index: 190 !important;
            top: var(--cui-forum-panel-top) !important;
            height: calc(100% - var(--cui-forum-panel-top)) !important;
            max-height: 100% !important; overflow: hidden !important;
        }
        .${m.popout?.container} {
            border-top: 1px solid var(--border-subtle) !important;
            border-left: 1px solid var(--border-subtle) !important;
        }
        .${m.popout?.chatLayerWrapper} > * { width: 100% !important; border-radius: 0 !important; }
        .${m.guilds?.threadSidebarOpen} { flex-shrink: 999999999 !important; }
        .${m.guilds?.content}, .${m.calls?.noChat} {
            --width: var(--cui-forum-popout-width);
            --transition: max-width var(--cui-transition-speed), width var(--cui-transition-speed), min-width var(--cui-transition-speed);
        }
        .${m.guilds?.content}:after, .${m.calls?.noChat}:after {
            content: ""; display: ${el.getForumPopout() ? "block" : "none"};
            height: 100%; max-width: var(--width); width: var(--width);
            min-width: var(--width); transition: var(--transition);
        }
        ${s.forumPopoutWidth ? `
            .${m.popout?.chatLayerWrapper}:before {
                cursor: e-resize; z-index: 200; position: absolute; content: "";
                width: 16px; height: 100%; left: -4px;
            }
        ` : ""}
    `.replace(/\s+/g, " "));
}

function forumPopoutToggleCSS(): string {
    return `
        .${m.popout?.chatLayerWrapper} {
            max-width: var(--cui-collapse-size) !important;
            width: var(--cui-collapse-size) !important;
            min-width: var(--cui-collapse-size) !important;
        }
        .${m.guilds?.content}:after, .${m.calls?.noChat}:after {
            max-width: var(--cui-collapse-size);
            width: var(--cui-collapse-size);
            min-width: var(--cui-collapse-size);
        }
    `.replace(/\s+/g, " ");
}

function forumPopoutFloatCSS(): string {
    return `
        .${m.guilds?.content}:after, .${m.calls?.noChat}:after {
            max-width: 0 !important; width: 0 !important; min-width: 0 !important;
        }
    `.replace(/\s+/g, " ");
}

// ─── Activity Panel ───

function activityPanelInit(): void {
    const s = getSettings();
    addStyle("activityPanel_init", `
        .${m.social?.nowPlayingColumn} {
            max-width: var(--cui-activity-panel-width) !important;
            width: var(--cui-activity-panel-width) !important;
            min-width: var(--cui-activity-panel-width) !important;
            transition: max-width var(--cui-transition-speed), width var(--cui-transition-speed), min-width var(--cui-transition-speed);
            display: initial !important;
        }
        .${m.activity?.itemCard} { overflow: hidden !important; }
        ${s.activityPanelWidth ? `
            .${m.social?.nowPlayingColumn}:before {
                cursor: e-resize; z-index: 200; position: absolute; content: "";
                width: 16px; height: 100%; transform: translateX(-4px);
            }
        ` : ""}
    `.replace(/\s+/g, " "));
}

function activityPanelToggleCSS(): string {
    return `
        .${m.social?.nowPlayingColumn} {
            max-width: var(--cui-collapse-size) !important;
            width: var(--cui-collapse-size) !important;
            min-width: var(--cui-collapse-size) !important;
        }
    `.replace(/\s+/g, " ");
}

function activityPanelFloatCSS(): string {
    return `
        .${m.social?.nowPlayingColumn} {
            position: absolute !important; z-index: 190 !important;
            right: 0 !important; height: 100% !important; max-height: 100% !important;
        }
    `.replace(/\s+/g, " ");
}

// ─── Panel Init/Toggle/Float/Clear Dispatch ───

const PANEL_NAMES = [
    "serverList", "channelList", "membersList", "userProfile",
    "messageInput", "windowBar", "callWindow", "userArea",
    "searchPanel", "forumPopout", "activityPanel",
];

const PANEL_INIT_FNS = [
    serverListInit, channelListInit, membersListInit, userProfileInit,
    messageInputInit, windowBarInit, callWindowInit, userAreaInit,
    searchPanelInit, forumPopoutInit, activityPanelInit,
];

const PANEL_TOGGLE_CSS_FNS = [
    serverListToggleCSS, channelListToggleCSS, membersListToggleCSS, userProfileToggleCSS,
    messageInputToggleCSS, windowBarToggleCSS, callWindowToggleCSS, userAreaToggleCSS,
    searchPanelToggleCSS, forumPopoutToggleCSS, activityPanelToggleCSS,
];

const PANEL_FLOAT_CSS_FNS: ((() => string) | null)[] = [
    serverListFloatCSS, channelListFloatCSS, membersListFloatCSS, userProfileFloatCSS,
    messageInputFloatCSS, windowBarFloatCSS, null, null,
    searchPanelFloatCSS, forumPopoutFloatCSS, activityPanelFloatCSS,
];

export function initPanel(index: number): void {
    PANEL_INIT_FNS[index]();
}

export function togglePanel(index: number): void {
    const s = getSettings();
    const state = panelStates[index];
    const name = PANEL_NAMES[index];

    if (!s.collapseDisabledButtons && s.buttonIndexes[index] === 0) {
        state.toggled = !state.toggled;
        return;
    }

    updateVariables();

    if (!s.expandOnHover || !s.expandOnHoverEnabled[index]) {
        if (state.toggled) addStyle(`${name}_toggle`, PANEL_TOGGLE_CSS_FNS[index]());
        else removeStyle(`${name}_toggle`);
    } else {
        if (state.toggled) {
            addStyle(`${name}_toggle_dynamic`, PANEL_TOGGLE_CSS_FNS[index]());
            const floatFn = PANEL_FLOAT_CSS_FNS[index];
            if (floatFn && s.floatingPanels && s.floatingEnabled[index] === "hover")
                setTimeout(() => addStyle(`${name}_float`, floatFn()), s.transitionSpeed);
        } else {
            removeStyle(`${name}_toggle_dynamic`);
            const floatFn = PANEL_FLOAT_CSS_FNS[index];
            if (floatFn && s.floatingPanels && s.floatingEnabled[index] === "hover")
                removeStyle(`${name}_float`);
        }
    }

    state.toggled = !state.toggled;
}

export function floatPanel(index: number): void {
    const floatFn = PANEL_FLOAT_CSS_FNS[index];
    if (floatFn) addStyle(`${PANEL_NAMES[index]}_float`, floatFn());
}

export function clearPanel(index: number): void {
    const name = PANEL_NAMES[index];
    removeStyle(`${name}_init`);
    removeStyle(`${name}_toggle`);
    removeStyle(`${name}_toggle_dynamic`);
    removeStyle(`${name}_float`);
    removeStyle(`${name}_queryToggle`);
    panelStates[index].toggled = true;
}

export function collapseElementDynamic(index: number, collapsed: boolean, collapsedStates: boolean[]): void {
    const s = getSettings();
    const name = PANEL_NAMES[index];

    if (collapsed) {
        addStyle(`${name}_toggle_dynamic`, PANEL_TOGGLE_CSS_FNS[index]());
    } else {
        removeStyle(`${name}_toggle_dynamic`);
    }

    collapsedStates[index] = collapsed;
}

// ─── Button Group Styles ───

export function initSettingsButtons(): void {
    const s = getSettings();
    addStyle("settingsButtons_init", `
        .${m.user?.avatarWrapper} { flex-grow: 1 !important; }
        .${m.user?.buttons} {
            transition: gap var(--cui-transition-speed) !important;
            transform: translateX(calc((1 - var(--cui-channel-list-toggled)) * 1000000000px));
        }
        .${m.user?.buttons} > *:not(:last-child):not(.gameActivityToggleButton_fd3fb5) {
            transition: width var(--cui-transition-speed) !important;
            overflow: hidden !important;
        }
    `.replace(/\s+/g, " "));
    if (s.collapseSettings) hideSettingsButtons();
}

export function hideSettingsButtons(): void {
    addStyle("settingsButtons_hide", `
        .${m.user?.buttons} { gap: 0px !important; }
        .${m.user?.buttons} > *:not(:last-child):not(.gameActivityToggleButton_fd3fb5) { width: 0px !important; }
    `.replace(/\s+/g, " "));
}

export function showSettingsButtons(): void {
    removeStyle("settingsButtons_hide");
}

export function clearSettingsButtons(): void {
    showSettingsButtons();
    removeStyle("settingsButtons_init");
}

export function initMessageInputButtons(): void {
    const s = getSettings();
    addStyle("messageInputButtons_init", `
        .${m.input?.buttons} { transition: gap var(--cui-transition-speed) !important; }
        .${m.input?.buttons} > *:not(:last-child) {
            transition: max-width var(--cui-transition-speed) !important;
            max-width: ${s.messageInputButtonWidth}px !important;
            overflow: hidden !important;
        }
    `.replace(/\s+/g, " "));
    if (s.messageInputCollapse) hideMessageInputButtons();
}

export function hideMessageInputButtons(): void {
    addStyle("messageInputButtons_hide", `
        .${m.input?.buttons} { gap: 0px !important; }
        .${m.input?.buttons} > *:not(:last-child) { max-width: 0px !important; }
    `.replace(/\s+/g, " "));
}

export function showMessageInputButtons(): void {
    removeStyle("messageInputButtons_hide");
}

export function clearMessageInputButtons(): void {
    showMessageInputButtons();
    removeStyle("messageInputButtons_init");
}

export function initToolbarButtons(): void {
    const s = getSettings();
    addStyle("toolbarButtons_init", `
        .cui-toolbar > *:not(:last-child) {
            transition: width var(--cui-transition-speed) !important;
            width: var(--space-32) !important;
            overflow: hidden !important;
        }
    `.replace(/\s+/g, " "));
    if (s.collapseToolbar === "cui") hideToolbarButtons();
}

export function hideToolbarButtons(): void {
    addStyle("toolbarButtons_hide", `
        .cui-toolbar { gap: 0 !important; }
        .cui-toolbar > *:not(:last-child) { width: 0px !important; margin: 0px !important; }
    `.replace(/\s+/g, " "));
}

export function showToolbarButtons(): void {
    removeStyle("toolbarButtons_hide");
}

export function clearToolbarButtons(): void {
    showToolbarButtons();
    removeStyle("toolbarButtons_init");
}

export function initToolbarFull(): void {
    const s = getSettings();
    addStyle("toolbarFull_init", `
        .${m.guilds?.title} .${m.icons?.toolbar} > *:not(:last-child) {
            transition: max-width var(--cui-transition-speed) !important;
            max-width: ${s.toolbarElementMaxWidth}px !important;
            overflow: hidden !important;
        }
    `.replace(/\s+/g, " "));
    if (s.collapseToolbar === "all") hideToolbarFull();
}

export function hideToolbarFull(): void {
    addStyle("toolbarFull_hide", `
        .${m.guilds?.title} .${m.icons?.toolbar} > *:not(:last-child) { max-width: 0px !important; }
    `.replace(/\s+/g, " "));
}

export function showToolbarFull(): void {
    removeStyle("toolbarFull_hide");
}

export function clearToolbarFull(): void {
    showToolbarFull();
    removeStyle("toolbarFull_init");
}

// ─── Master Init / Clear ───

export function initAllStyles(): void {
    const s = getSettings();
    initRootStyles();

    for (let i = 0; i < PANEL_COUNT; i++) {
        initPanel(i);
        if (!s.buttonsActive[i]) togglePanel(i);
    }

    initSettingsButtons();
    initMessageInputButtons();
    initToolbarButtons();
    initToolbarFull();
}

export function clearAllStyles(): void {
    clearRootStyles();

    for (let i = 0; i < PANEL_COUNT; i++) {
        clearPanel(i);
    }

    clearSettingsButtons();
    clearMessageInputButtons();
    clearToolbarButtons();
    clearToolbarFull();
}
