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
};

export const settings = definePluginSettings({
    enable: {
        description: "Enable Logging for Navigating Voice Channels",
        type: OptionType.BOOLEAN,
        default: true
    },
    ignoreBlockedUsers: {
        description: "Do not notify about blocked users",
        type: OptionType.BOOLEAN,
        default: false
    },
    trackUsers: {
        description: "Will notify users over other filters if they are in whitelist",
        type: OptionType.BOOLEAN,
        default: false
    },
    trackingMode: {
        description: "tracking mode",
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
                label: "all voice channel",
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
    guildsFilter: {
        description: "guilds filter mode",
        type: OptionType.SELECT,
        options: [
            {
                label: "blacklist",
                value: Filter.BLACK,
                default: true
            },
            {
                label: "whitelist",
                value: Filter.WHITE,
            },
        ]
    },
    guilds: {
        description: "guilds id separated by comma (,)",
        type: OptionType.STRING,
    },
    channelsFilter: {
        description: "channels filter mode",
        type: OptionType.SELECT,
        options: [
            {
                label: "blacklist",
                value: Filter.BLACK,
                default: true
            },
            {
                label: "whitelist",
                value: Filter.WHITE,
            },
        ]
    },
    channels: {
        description: "channels id separated by comma (,)",
        type: OptionType.STRING,
    },
    usersFilter: {
        description: "users filter mode",
        type: OptionType.SELECT,
        options: [
            {
                label: "blacklist",
                value: Filter.BLACK,
                default: true
            },
            {
                label: "whitelist",
                value: Filter.WHITE,
            },
        ]
    },
    users: {
        description: "users id separated by comma (,)",
        type: OptionType.STRING,
    }
});
