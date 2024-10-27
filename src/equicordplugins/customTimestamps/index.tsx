/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Forms, moment } from "@webpack/common";

const settings = definePluginSettings({
    cozyFormat: {
        type: OptionType.STRING,
        default: "[calendar]",
        description: "time format to use in messages on cozy mode",
    },
    compactFormat: {
        type: OptionType.STRING,
        default: "LT",
        description: "time format on compact mode and hovering messages",
    },
    tooltipFormat: {
        type: OptionType.STRING,
        default: "LLLL • [relative]",
        description: "time format to use on tooltips",
    },
    sameDayFormat: {
        type: OptionType.STRING,
        default: "HH:mm:ss",
        description: "[calendar] format for today"
    },
    lastDayFormat: {
        type: OptionType.STRING,
        default: "[yesterday] HH:mm:ss",
        description: "[calendar] format for yesterday"
    },
    lastWeekFormat: {
        type: OptionType.STRING,
        default: "ddd DD.MM.YYYY HH:mm:ss",
        description: "[calendar] format for last week"
    },
    sameElseFormat: {
        type: OptionType.STRING,
        default: "ddd DD.MM.YYYY HH:mm:ss",
        description: "[calendar] format for older dates"
    },
});

export default definePlugin({
    name: "CustomTimestamps",
    description: "Custom timestamps on messages and tooltips",
    authors: [Devs.Rini, EquicordDevs.nvhhr],
    settings,
    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">How to use:</Forms.FormTitle>
            <Forms.FormText>
                <Link href="https://momentjs.com/docs/#/displaying/format/">Moment.js formatting documentation</Link>
                <p>
                    Additionally you can use these in your inputs:<br />
                    <b>[calendar]</b> enables dynamic date formatting (see options below),<br />
                    <b>[relative]</b> gives you times such as &quot;4 hours ago&quot;.<br />
                </p>
            </Forms.FormText>
        </>
    ),
    patches: [{
        find: "MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL.format",
        replacement: [
            {
                match: /(?<=\i=\i\?)\(0,\i\.\i\)\((\i),"LT"\):\(0,\i\.\i\)\(\i\)/,
                replace: '$self.format($1,"compactFormat","[calendar]"):$self.format($1,"cozyFormat","LT")',
            },
            {
                match: /(?<=text:)\(0,\i.\i\)\((\i),"LLLL"\)(?=,)/,
                replace: '$self.format($1,"tooltipFormat","LLLL")',
            },
        ]
    }],

    format(date: Date, key: string, fallback: string) {
        const t = moment(date);
        const sameDayFormat = settings.store.sameDayFormat || "HH:mm:ss";
        const lastDayFormat = settings.store.lastDayFormat || "[yesterday] HH:mm:ss";
        const lastWeekFormat = settings.store.lastWeekFormat || "ddd DD.MM.YYYY HH:mm:ss";
        const sameElseFormat = settings.store.sameElseFormat || "ddd DD.MM.YYYY HH:mm:ss";
        return t.format(settings.store[key] || fallback)
            .replace("relative", () => t.fromNow())
            .replace("calendar", () => t.calendar(null, {
                sameDay: sameDayFormat,
                lastDay: lastDayFormat,
                lastWeek: lastWeekFormat,
                sameElse: sameElseFormat
            }));
    },
});
