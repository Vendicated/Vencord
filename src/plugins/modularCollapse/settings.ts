/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

const STORE_KEY = "ModularCollapse";

// Default values for all settings
export interface CUISettings {
    transitionSpeed: number;
    collapseToolbar: false | "cui" | "all";
    collapseSettings: boolean;
    messageInputCollapse: boolean;
    keyboardShortcuts: boolean;
    shortcutList: string[][];
    collapseDisabledButtons: boolean;
    buttonIndexes: number[];
    floatingPanels: boolean;
    floatingEnabled: (false | "hover" | "always" | null)[];
    expandOnHover: boolean;
    expandOnHoverEnabled: boolean[];
    sizeCollapse: boolean;
    sizeCollapseThreshold: number[];
    conditionalCollapse: boolean;
    collapseConditionals: string[];
    collapseSize: number;
    buttonCollapseFudgeFactor: number;
    expandOnHoverFudgeFactor: number;
    messageInputButtonWidth: number;
    toolbarElementMaxWidth: number;
    userAreaMaxHeight: number;
    buttonsActive: boolean[];
    channelListWidth: number;
    membersListWidth: number;
    userProfileWidth: number;
    searchPanelWidth: number;
    forumPopoutWidth: number;
    activityPanelWidth: number;
    defaultChannelListWidth: number;
    defaultMembersListWidth: number;
    defaultUserProfileWidth: number;
    defaultSearchPanelWidth: number;
    defaultForumPopoutWidth: number;
    defaultActivityPanelWidth: number;
}

const DEFAULTS: CUISettings = {
    transitionSpeed: 200,
    collapseToolbar: "cui",
    collapseSettings: true,
    messageInputCollapse: true,
    keyboardShortcuts: true,
    shortcutList: [
        ["Alt", "s"], ["Alt", "c"], ["Alt", "m"], ["Alt", "p"],
        ["Alt", "i"], ["Alt", "w"], ["Alt", "v"], ["Alt", "u"],
        ["Alt", "q"], ["Alt", "f"], ["Alt", "a"],
    ],
    collapseDisabledButtons: false,
    buttonIndexes: [1, 2, 4, 5, 3, 0, 9, 0, 6, 7, 8],
    floatingPanels: true,
    floatingEnabled: ["hover", "hover", "hover", "hover", "hover", "hover", null, null, "hover", "hover", "hover"],
    expandOnHover: true,
    expandOnHoverEnabled: [true, true, true, true, true, true, true, true, true, true, true],
    sizeCollapse: false,
    sizeCollapseThreshold: [500, 600, 950, 1200, 400, 200, 550, 400, 950, 950, 950],
    conditionalCollapse: false,
    collapseConditionals: ["", "", "", "", "", "", "", "", "", "", ""],
    collapseSize: 0,
    buttonCollapseFudgeFactor: 10,
    expandOnHoverFudgeFactor: 15,
    messageInputButtonWidth: 40,
    toolbarElementMaxWidth: 400,
    userAreaMaxHeight: 420,
    buttonsActive: [true, true, true, true, true, true, true, true, true, true, true],
    channelListWidth: 240,
    membersListWidth: 240,
    userProfileWidth: 340,
    searchPanelWidth: 418,
    forumPopoutWidth: 450,
    activityPanelWidth: 360,
    defaultChannelListWidth: 240,
    defaultMembersListWidth: 240,
    defaultUserProfileWidth: 340,
    defaultSearchPanelWidth: 418,
    defaultForumPopoutWidth: 450,
    defaultActivityPanelWidth: 360,
};

// In-memory settings cache
let _settings: CUISettings | null = null;

/** Load settings from DataStore (async, call once at start) */
export async function loadSettings(): Promise<CUISettings> {
    const stored = await DataStore.get(STORE_KEY) as Partial<CUISettings> | undefined;
    _settings = { ...DEFAULTS, ...(stored ?? {}) };
    return _settings;
}

/** Get the current settings (synchronous, must call loadSettings first) */
export function getSettings(): CUISettings {
    if (!_settings) _settings = { ...DEFAULTS };
    return _settings;
}

/** Save a single setting */
export async function setSetting<K extends keyof CUISettings>(key: K, value: CUISettings[K]): Promise<void> {
    const s = getSettings();
    s[key] = value;
    await DataStore.set(STORE_KEY, { ...s });
}

/** Update a single index in an array setting */
export async function setSettingArrayIndex<K extends keyof CUISettings>(
    key: K,
    index: number,
    value: any
): Promise<void> {
    const s = getSettings();
    const arr = s[key] as any[];
    if (Array.isArray(arr)) {
        arr[index] = value;
        await DataStore.set(STORE_KEY, { ...s });
    }
}

/** Get the parsed shortcut list as Sets (for matching) */
export function getShortcutSets(): Set<string>[] {
    const s = getSettings();
    return s.shortcutList.map(keys => new Set(keys));
}
