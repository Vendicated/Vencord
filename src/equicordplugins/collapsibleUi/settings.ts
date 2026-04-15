/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const transitionMarkers = [0, 80, 120, 160, 200, 260, 320];

export const panelRegistry = {
    channelList: {
        id: "channelList",
        classId: "channel-list",
        label: "Channel List",
        collapsedKey: "channelListCollapsed",
    },
    membersList: {
        id: "membersList",
        classId: "members-list",
        label: "Members List",
        collapsedKey: "membersListCollapsed",
    },
    chatButtons: {
        id: "chatButtons",
        classId: "chat-buttons",
        label: "Message Buttons",
        collapsedKey: "chatButtonsCollapsed",
    },
    userArea: {
        id: "userArea",
        classId: "user-area",
        label: "User Area",
        collapsedKey: "userAreaCollapsed",
    },
} as const;

export type PanelId = keyof typeof panelRegistry;

export const toolbarPanelOrder = ["channelList", "membersList", "chatButtons", "userArea"] as const satisfies readonly PanelId[];

export const settings = definePluginSettings({
    transitionMs: {
        type: OptionType.SLIDER,
        description: "Panel transition speed in milliseconds.",
        default: 160,
        markers: transitionMarkers,
    },
    channelListCollapsed: {
        type: OptionType.BOOLEAN,
        description: "Persist the channel list as collapsed.",
        default: false,
    },
    membersListCollapsed: {
        type: OptionType.BOOLEAN,
        description: "Persist the members list as collapsed.",
        default: false,
    },
    chatButtonsCollapsed: {
        type: OptionType.BOOLEAN,
        description: "Persist the message button row as collapsed.",
        default: false,
    },
    userAreaCollapsed: {
        type: OptionType.BOOLEAN,
        description: "Persist the user area as collapsed.",
        default: false,
    },
});
