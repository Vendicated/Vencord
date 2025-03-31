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
    cozyFormat: {
        default: "[calendar]"
    },
    compactFormat: {
        default: "LT:ss"
    },
    tooltipFormat: {
        default: "LLLL:ss • [relative]"
    },
    sameDayFormat: {
        default: "HH:mm:ss"
    },
    lastDayFormat: {
        default: "[yesterday] HH:mm:ss"
    },
    lastWeekFormat: {
        default: "ddd DD/MM/YYYY HH:mm:ss"
    },
    sameElseFormat: {
        default: "ddd DD/MM/YYYY HH:mm:ss"
    }
};

const format = (date: Date, formatTemplate: string): string => {
    const mmt = moment(date);

    const sameDayFormat = timeFormats.sameDayFormat.default;
    const lastDayFormat = timeFormats.lastDayFormat.default;
    const lastWeekFormat = timeFormats.lastWeekFormat.default;
    const sameElseFormat = timeFormats.sameElseFormat.default;

    return mmt.format(formatTemplate)
        .replace("calendar", () => mmt.calendar(null, {
            sameDay: sameDayFormat,
            lastDay: lastDayFormat,
            lastWeek: lastWeekFormat,
            sameElse: sameElseFormat
        }))
        .replace("relative", () => mmt.fromNow());
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
        let formatTemplate: string;

        if (!this.settings.store.showSeconds) {
            switch (type) {
                case "cozy":
                    formatTemplate = "[calendar]";
                    break;
                case "compact":
                    formatTemplate = "LT";
                    break;
                case "tooltip":
                    formatTemplate = "LLLL";
                    break;
            }
        } else {
            switch (type) {
                case "cozy":
                    formatTemplate = timeFormats.cozyFormat.default;
                    break;
                case "compact":
                    formatTemplate = timeFormats.compactFormat.default;
                    break;
                case "tooltip":
                    formatTemplate = timeFormats.tooltipFormat.default;
                    break;
            }
        }

        useEffect(() => {
            if (formatTemplate.includes("calendar") || formatTemplate.includes("relative")) {
                const interval = setInterval(forceUpdater, 30000);
                return () => clearInterval(interval);
            }
        }, []);

        return format(date, formatTemplate);
    }
}); 