/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
// import { Logger } from "@utils/Logger";


export const TrackingMode = {
    ALL: "all",
    CHANNEL: "channel",
    GUILD: "guild",
    SELECTED_GUILD: "selected-guild",
    SELECTED_CHANNEL: "selected-channel",
};

export const LoggingMode = {
    JOINED: "joined",
    SELECTED: "selected",
};

export const Filter = {
    WHITE: "white",
    BLACK: "black",
    NONE: "none"
};

export const filterOpts = () => [
    {
        label: "blacklist",
        value: Filter.BLACK,
    },
    {
        label: "whitelist",
        value: Filter.WHITE,
    },
    {
        label: "ignore",
        value: Filter.NONE,
        default: true
    },
];

export const settings = definePluginSettings({
    enable: {
        description: "Enable Logging for Navigating Voice Channels",
        type: OptionType.BOOLEAN,
        default: true
    },
    self: {
        description: "log myself too",
        type: OptionType.BOOLEAN,
        default: false
    },
    ignoreBlockedUsers: {
        description: "Do not log about blocked users",
        type: OptionType.BOOLEAN,
        default: false
    },
    trackUsers: {
        description: "Will log users over other filters if they are in whitelist",
        type: OptionType.BOOLEAN,
        default: false
    },
    trackingMode: {
        description: "Which voice channels should be tracked?",
        type: OptionType.SELECT,
        options: [
            {
                label: "only joined voice channel",
                value: TrackingMode.CHANNEL,
                default: true
            },
            {
                label: "only guild of joined voice channel",
                value: TrackingMode.GUILD,
            },
            {
                label: "selected guild",
                value: TrackingMode.SELECTED_GUILD,
            },
            {
                label: "selected voice channel",
                value: TrackingMode.SELECTED_CHANNEL,
            },
            {
                label: "all voice channels",
                value: TrackingMode.ALL,
            },
        ]
    },
    loggingMode: {
        description: "logging mode",
        type: OptionType.SELECT,
        options: [
            {
                label: "joined voice chat",
                value: LoggingMode.JOINED,
                default: true
            },
            {
                label: "selected channel",
                value: LoggingMode.SELECTED,
            },
        ]
    },
    usersFilter: {
        description: "users filter mode",
        type: OptionType.SELECT,
        options: filterOpts(),
    },
    channelsFilter: {
        description: "channels filter mode",
        type: OptionType.SELECT,
        options: filterOpts(),
    },
    guildsFilter: {
        description: "guilds filter mode",
        type: OptionType.SELECT,
        options: filterOpts(),
    },
    users: {
        description: "users id separated by comma (,)",
        type: OptionType.STRING,
    },
    channels: {
        description: "channels id separated by comma (,)",
        type: OptionType.STRING,
    },
    guilds: {
        description: "guilds id separated by comma (,)",
        type: OptionType.STRING,
    },
});
