/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import moment from "moment";

export default definePlugin({
    name: "DetailedTimestamp",
    description: "Show detailed timestamp of messages with customizable format",
    authors: [Devs.UlyssesZhan],
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
        },
        callFormat: {
            type: OptionType.STRING,
            description: "Time format of calling events (Discord default: L LT)",
            default: "HH:mm:ss",
        },
        memberSinceFormat: {
            type: OptionType.STRING,
            description: "Time format of member since (Discord default: ll (lowercase))",
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
                match: /\i\?(\(0,.*?)"LT"\):\(0,.*?\)\(\i\),/,
                replace: "$1$self.settings.store.messageFormat),"
            }
        },
        {
            find: "\"LLLL\"),",
            replacement: {
                match: /"LLLL"/,
                replace: "$self.settings.store.tooltipFormat"
            }
        },
        {
            find: "].startId),",
            replacement: {
                match: /"LL"/,
                replace: "$self.settings.store.dayFormat"
            }
        },
        {
            find: "().localeData(),",
            replacement: {
                match: /"L LT"/,
                replace: "$self.settings.store.callFormat"
            }
        },

        {
            find: "USER_PROFILE_DISCORD_MEMBER_SINCE}",
            replacement: {
                // (0, a.FI)(u.Z.extractTimestamp(t), p) ... (0, a.FI)(g.joinedAt, p)
                // where `t` is user id, extracted timestamp is milliseconds unix timestamp, `p` is locale (I think)
                match: /\(0,\i\.\i\)\((\i\.\i\.extractTimestamp\(\i\)),\i\)(.{0,800})\(0,\i\.\i\)\((\i\.joinedAt),\i\)/,
                replace: "$self.formatTime($1, $self.settings.store.memberSinceFormat) $2 $self.formatTime($3, $self.settings.store.memberSinceFormat)"
            }
        }
    ],
    formatTime(time: number, format: string) {
        return moment(time).format(format);
    }
});
