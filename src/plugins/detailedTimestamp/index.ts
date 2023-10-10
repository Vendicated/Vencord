/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import moment from "moment";
import { ComponentClass, ComponentType } from "react";
const classNames = findByPropsLazy("timestampTooltip");

function re(strings: TemplateStringsArray, ...values: any[]) {
    const s = String.raw(strings, ...values)
        .trim()
        .split("\n")
        .map(line => {
            line = line.trimStart();
            if (line.startsWith("#")) return null;
            return line;
        })
        .filter(Boolean)
        .join("");
    return new RegExp(s);
}

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
            description: "Time format of messages (Discord default: LT for compact mode)",
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
            description: "Time format of calling events before today (Discord default: L LT)",
            default: "HH:mm:ss",
        },
        memberSinceFormat: {
            type: OptionType.STRING,
            description: "Time format of member since (Discord default: ll (lowercase))",
            default: "YYYY-MM-DD",
        },
        memberSinceTooltips: {
            type: OptionType.BOOLEAN,
            description: "Show member since tooltips",
            default: true,
        },
        memberSinceTooltipFormat: {
            type: OptionType.STRING,
            description: "Time format of member since tooltips (only useful when the previous option is enabled)",
            default: "YYYY-MM-DDTHH:mm:ss.SSSZ (x)",
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
                // (0, r.jsx)(o.Text, { ... (0, a.FI)(u.Z.extractTimestamp(t), p) }), ...
                // (0, r.jsx)(o.Text, { ... (0, a.FI)(g.joinedAt, p) })
                // where `t` is user id, timestamps are milliseconds unix timestamp, `p` is locale (I think)
                match: re`
                    # React.createElement
                    (\(0,\i\.\i\))\(
                        # component type namespace
                        (\i)\.Text,\{
                            # unmodified parameters
                            (.{0,200}),
                            children:\(0,\i\.\i\)\(
                                # timestamp
                                (\i\.\i\.extractTimestamp\(\i\)),
                                \i
                            \)
                        \}
                    \),
                    # unmodified components
                    (.{0,800}),
                    \(0,\i\.\i\)\(\i\.Text,\{
                        # unmodified parameters
                        (.{0,200}),
                        children:\(0,\i\.\i\)\(
                            # timestamp
                            (\i\.joinedAt),
                            \i
                        \)
                    \}\)
                `,
                replace: (matched, createElement, componentTypes, unmodifiedParameters1, timestamp1, unmodifiedComponents, unmodifiedParameters2, timestamp2) => {
                    return `
                        $self.wrapTooltip(${createElement}, ${componentTypes}, ${timestamp1}, {${unmodifiedParameters1}}),
                        ${unmodifiedComponents},
                        $self.wrapTooltip(${createElement}, ${componentTypes}, ${timestamp2}, {${unmodifiedParameters2}})
                    `;
                }
            }
        }
    ],

    formatTime(time: number, format: string) {
        return moment(time).format(format);
    },
    wrapTooltip(createElement: (type: ComponentType, options: any) => ComponentClass, componentTypes: any, timestamp: number, componentOptions: any) {
        componentOptions.children = this.formatTime(timestamp, this.settings.store.memberSinceFormat);
        if (!this.settings.store.memberSinceTooltips) {
            return createElement(componentTypes.Text, componentOptions);
        }
        return createElement(componentTypes.Tooltip, {
            text: this.formatTime(timestamp, this.settings.store.memberSinceTooltipFormat),
            tooltipClassName: classNames,
            delay: 750,
            children: (e: any) => createElement(componentTypes.Text, Object.assign(componentOptions, e))
        });
    }
});
