/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { moment } from "@webpack/common";
import { useEffect } from "@webpack/common";
import { useForceUpdater } from "@utils/react";

const timeFormats = {
    default: "HH:mm:ss",
    tooltip: "LLLL:ss"
};

export default definePlugin({
    name: "ShowSeconds",
    description: "Shows seconds in message timestamps",
    authors: [Devs.leafyzito],

    settings: definePluginSettings({
        showSeconds: {
            type: OptionType.BOOLEAN,
            description: "Show seconds in message timestamps",
            default: true
        },
        formats: {
            type: OptionType.STRING,
            description: "Timestamp format",
            default: "HH:mm:ss"
        }
    }),

    patches: [
        {
            find: "#{intl::MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL}",
            replacement: [
                {
                    match: /(\i)\?\(0,\i\.\i\)\((\i),"LT"\):\(0,\i\.\i\)\(\i,!0\)/,
                    replace: "$self.renderTimestamp($2,$1?'compact':'cozy')",
                },
                {
                    match: /(?<=text:)\(0,\i.\i\)\((\i),"LLLL"\)(?=,)/,
                    replace: "$self.renderTimestamp($1,'tooltip')",
                },
            ]
        }
    ],

    start() {
        console.log("ShowSeconds plugin started");
    },

    renderTimestamp(date: Date, type: "cozy" | "compact" | "tooltip") {
        const forceUpdater = useForceUpdater();
        const formatTemplate = type === "tooltip"
            ? timeFormats.tooltip
            : (this.settings.store.formats || timeFormats.default);

        useEffect(() => {
            if (formatTemplate.includes("calendar") || formatTemplate.includes("relative")) {
                const interval = setInterval(forceUpdater, 30000);
                return () => clearInterval(interval);
            }
        }, []);

        return moment(date).format(formatTemplate);
    }
}); 