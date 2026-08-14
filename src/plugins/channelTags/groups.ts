/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type GroupName = string & { _brand: "group"; };
export const HiddenFor = {
    DM: "dm",
    GroupDM: "groupDM",
    Thread: "thread",
    Channel: "channel"
} as const;
export type HiddenFor = (typeof HiddenFor)[keyof typeof HiddenFor];

export type HiddenForMap = Record<HiddenFor, boolean>;
export interface Group {
    isExclusive: boolean;
    showInSubmenu: boolean;
    hiddenFor: HiddenForMap;
}
export type GroupMap = Record<GroupName, Group>;

export const DEFAULT_GROUP: Group = {
    isExclusive: true,
    showInSubmenu: false,
    hiddenFor: {
        dm: false,
        groupDM: false,
        thread: false,
        channel: false
    }
};

export function createDefaultGroup(): Group {
    return { ...DEFAULT_GROUP, hiddenFor: { ...DEFAULT_GROUP.hiddenFor } };
}

export const toGroupName = (name: string | undefined) => {
    const trimmed = name?.trim();
    return trimmed ? trimmed as GroupName : undefined;
};
