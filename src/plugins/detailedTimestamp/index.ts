/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "DetailedTimestamp",
    description: "Show detailed timestamp of messages with customizable format",
    authors: [
        {
            id: 586808226058862623n,
            name: "UlyssesZhan",
        },
    ],
    settings: definePluginSettings({
        timestampAlwaysOn: {
            type: OptionType.BOOLEAN,
            description: "Always show timestamp of messages instead of on hover",
            default: true,
        },
        messageFormat: {
            type: OptionType.STRING,
            description: "Time format of messages (Discord default: LT)",
            default: "HH:mm:ss",
        },
        tooltipFormat: {
            type: OptionType.STRING,
            description: "Time format of time tooltips of messages (Discord default: LLLL)",
            default: "YYYY-MM-DDTHH:mm:ss.SSSZ (x)",
        },
        dayFormat: {
            type: OptionType.STRING,
            description: "Time format of days (Discord default: LL)",
            default: "YYYY-MM-DD",
        }
    }),
    patches: [
        {
            find: "showTimestampOnHover:!",
            replacement: {
                match: /showTimestampOnHover:(.*?\.REPLY),/,
                replace: "showTimestampOnHover: ($1) && !$self.settings.store.timestampAlwaysOn,"
            }
        },
        {
            find: "\"LT\"):(",
            replacement: {
                match: /"LT"/,
                replace: "$self.settings.store.messageFormat"
            }
        },
        { // Time format of time tooltip of message
            find: "\"LLLL\"),",
            replacement: {
                match: /"LLLL"/,
                replace: "$self.settings.store.tooltipFormat"
            }
        },
        { // Time format of day
            find: "].startId),",
            replacement: {
                match: /"LL"/,
                replace: "$self.settings.store.dayFormat"
            }
        }
    ]
});
