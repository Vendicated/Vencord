/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentLazy } from "@webpack";

import TooltipWrapper from "./components/TooltipWrapper";
import { TimeoutReasonStore } from "./TimeoutReasonStore";

export const CountDown = findComponentLazy(m => m.prototype?.render?.toString().includes(".MAX_AGE_NEVER"));

export const enum DisplayStyle {
    Tooltip = "tooltip",
    Inline = "ssalggnikool"
}

export const settings = definePluginSettings({
    displayStyle: {
        description: "How to display the timeout duration and reason",
        type: OptionType.SELECT,
        options: [
            { label: "In the Tooltip", value: DisplayStyle.Tooltip },
            { label: "Next to the timeout icon", value: DisplayStyle.Inline, default: true },
        ],
    }
});

migratePluginSettings("ShowTimeoutDetails", "ShowTimeoutDuration");

export default definePlugin({
    name: "ShowTimeoutDetails",
    description: "Shows how much longer a user's timeout will last and why they are timed out, either in the timeout icon tooltip or next to it",
    authors: [Devs.Ven, Devs.Sqaaakoi],
    tags: ["ShowTimeoutDuration", "ShowTimeoutReason"],

    settings,

    patches: [
        {
            find: ".GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY",
            replacement: [
                {
                    match: /(\i)\.Tooltip,{(text:.{0,30}\.Messages\.GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY)/,
                    replace: "$self.TooltipWrapper,{message:arguments[0].message,$2"
                }
            ]
        }
    ],

    TimeoutReasonStore,

    TooltipWrapper: ErrorBoundary.wrap(TooltipWrapper, { noop: true })
});
