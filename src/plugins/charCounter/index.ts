/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import style from "./styles.css?managed";

let maxChars = 2000;
let currChars = 0;

const settings = definePluginSettings({
    characterCounterText: {
        type: OptionType.STRING,
        description: "$m = Max character count, $c = Current character count, $r = Remaining character count, \\ = Escape character",
        default: "$c/$m, $r characters remaining"
    },
    compareCurrWithRemaining: {
        type: OptionType.SELECT,
        description: "Only show the character counter when:",
        options: [
            { label: "remaining character count ≤", value: true },
            { label: "current character count ≥", value: false, default: true }
        ]
    },
    charCountToShowCounterAt: {
        type: OptionType.NUMBER,
        description: "",
        default: 0
    },
    interpretAsPercentage: {
        type: OptionType.SELECT,
        description: "",
        options: [
            { label: "% of max character count", value: true },
            { label: "characters", value: false, default: true }
        ]
    }
});

export default definePlugin({
    name: "CharCounter",
    authors: [Devs.ryan],
    description: "Adds a character counter to text boxes",
    patches: [
        {
            find: ".CHARACTER_COUNT_OVER_LIMIT",
            replacement: [
                {
                    match: /let{.*?}=(\i)[,;]/,
                    replace: "$1.type.upsellLongMessages=null;$&"
                },
                {
                    match: /(?<=[, ]\i=)null!=\i\?\i:\i[,;]/,
                    replace: "$self.maxChars=$&"
                },
                {
                    match: /(?<=[, ]\i=)\i\.length[,;]/,
                    replace: "$self.currChars=$&"
                },
                {
                    match: /(?<=\i=)\i>\i(?=,|;)/,
                    replace: "!$self.shouldShowCharCounter"
                },
                {
                    match: /\(\i\.Tooltip,{text:\i,/,
                    replace: "$&shouldShow:!1,"
                },
                {
                    match: /(?<=\("span",{(?:[^}]*,)?children:)\i(?=}|,)/,
                    replace: "$self.charCounterText"
                }
            ]
        }
    ],
    settings,
    set maxChars(n: number) {
        maxChars = n;
    },
    set currChars(n: number) {
        currChars = n;
    },
    get shouldShowCharCounter() {
        return settings.store.compareCurrWithRemaining ?
            settings.store.interpretAsPercentage ?
                (maxChars - currChars) / maxChars <= settings.store.charCountToShowCounterAt / 100
                : maxChars - currChars <= settings.store.charCountToShowCounterAt
            : settings.store.interpretAsPercentage ?
                currChars / maxChars >= settings.store.charCountToShowCounterAt / 100
                : currChars >= settings.store.charCountToShowCounterAt;
    },
    get charCounterText() {
        return settings.store.characterCounterText
            .replaceAll(/(?<!(?:^|[^\\])\\(?:\\\\)*)\$[mM]/g, maxChars.toString())
            .replaceAll(/(?<!(?:^|[^\\])\\(?:\\\\)*)\$[cC]/g, currChars.toString())
            .replaceAll(/(?<!(?:^|[^\\])\\(?:\\\\)*)\$[rR]/g, (maxChars - currChars).toString())
            .replaceAll(/\\(.|$)/g, "$1");
    },
    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    }
});
