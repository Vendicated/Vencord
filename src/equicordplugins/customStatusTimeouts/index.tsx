/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const Millis = {
    HALF_SECOND: 500,
    SECOND: 1e3,
    MINUTE: 6e4,
    HOUR: 36e5,
    DAY: 864e5,
    WEEK: 6048e5,
    DAYS_30: 2592e6
};

const settings = definePluginSettings({
    showForeverOnTop: {
        type: OptionType.BOOLEAN,
        description: "Show the Forever option at the top of the list instead of the bottom.",
        restartNeeded: true,
        default: true
    },
    extraSeconds: {
        type: OptionType.STRING,
        description: "Extra seconds to add, separated by a comma (e.g. 5, 10, 30)",
        restartNeeded: true,
        default: "15, 30, 45"
    },
    extraMinutes: {
        type: OptionType.STRING,
        description: "Extra minutes to add, separated by a comma (e.g. 5, 10, 30)",
        restartNeeded: true,
        default: "5, 10, 30"
    },
    extraHours: {
        type: OptionType.STRING,
        description: "Extra hours to add, separated by a comma (e.g. 2, 4, 6, 12)",
        restartNeeded: true,
        default: "2, 4, 6, 12"
    },
    extraDays: {
        type: OptionType.STRING,
        description: "Extra days to add, separated by a comma (e.g. 1, 2)",
        restartNeeded: true,
        default: "1, 2"
    },
});

export default definePlugin({
    name: "CustomStatusTimeouts",
    description: "Adds configurable timeout presets to the status (presence) menu.",
    tags: ["Activity", "Utility"],
    authors: [EquicordDevs.Kiri, EquicordDevs.thororen],
    settings,
    patches: [
        {
            find: "#{intl::DURATION_FOREVER}",
            replacement: {
                match: /\[\{duration.*?#{intl::DURATION_FOREVER}\)\}\]/,
                replace: "$self.buildTimeouts($&)"
            }
        }
    ],
    buildTimeouts(existing) {
        const parse = (str: string) => str.split(",").map(s => Number(s.trim())).filter(Boolean);

        const seconds = parse(settings.store.extraSeconds);
        const minutes = parse(settings.store.extraMinutes);
        const hours = parse(settings.store.extraHours);
        const days = parse(settings.store.extraDays);
        // I was testing weeks and months and for some reason random ones didnt apply look below for the working ones
        // tested weeks between 1-12 working weeks were 1, 2, 3, 8, 9, 10 the rest didnt work
        // tested months between 1-12 working months were 2, 4, 10, 12 the rest didnt work
        // for months I only tested evens except for 1 so I hardcoded them to avoid user complaints
        const weeks = [1, 2, 3];
        const months = [2, 4];

        const extra = [
            ...seconds.map(s => ({
                duration: s * Millis.SECOND,
                label: () => `For ${s} ${s === 1 ? "Second" : "Seconds"}`
            })),
            ...minutes.map(m => ({
                duration: m * Millis.MINUTE,
                label: () => `For ${m} ${m === 1 ? "Minute" : "Minutes"}`
            })),
            ...hours.map(h => ({
                duration: h * Millis.HOUR,
                label: () => `For ${h} ${h === 1 ? "Hour" : "Hours"}`
            })),
            ...days.map(d => ({
                duration: d * Millis.DAY,
                label: () => `For ${d} ${d === 1 ? "Day" : "Days"}`
            })),
            ...weeks.map(w => ({
                duration: w * Millis.WEEK,
                label: () => `For ${w} ${w === 1 ? "Week" : "Weeks"}`
            })),
            ...months.map(m => ({
                duration: m * Millis.DAYS_30,
                label: () => `For ${m} ${m === 1 ? "Month" : "Months"}`
            })),
        ];

        return [...existing, ...extra].sort((a, b) => {
            if (a.duration === undefined) return settings.store.showForeverOnTop ? -1 : 1;
            if (b.duration === undefined) return settings.store.showForeverOnTop ? 1 : -1;
            return a.duration - b.duration;
        });
    }
});
