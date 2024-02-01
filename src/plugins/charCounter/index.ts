/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import style from "./styles.css?managed";

class ValuePointer {
    value: number;

    constructor(value = 0) {
        this.value = value;
    }

    toString() {
        return `${this.value}`;
    }
}

const maxChars = new ValuePointer();
const currChars = new ValuePointer();
const remChars = new ValuePointer();

let charCounterTemplate: (string | ValuePointer)[] = [];

function compileCharCounterTemplate(value: string) {
    charCounterTemplate = value
        .split(/(?<!(?:^|[^\\])\\(?:\\\\)*)(\$[mMcCrR])/)
        .map(s => s.match(/^\$[mM]$/) ?
            maxChars
            : s.match(/^\$[cC]$/) ?
                currChars
                : s.match(/^\$[rR]$/) ?
                    remChars
                    : s.replaceAll(/\\(.|$)/g, "$1"));
}

const settings = definePluginSettings({
    characterCounterText: {
        type: OptionType.STRING,
        description: "$m = Max character count, $c = Current character count, $r = Remaining character count, \\ = Escape character",
        default: "$c/$m, $r characters remaining",
        onChange: compileCharCounterTemplate
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
                    match: /(?<=[, ]\i=(\i)-(\i)[,;].*)return /,
                    replace: "$self.setValues($1,$2);$&"
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
    setValues(max: number, curr: number) {
        maxChars.value = max;
        currChars.value = curr;
        remChars.value = max - curr;
    },
    get shouldShowCharCounter() {
        return settings.store.compareCurrWithRemaining ?
            settings.store.interpretAsPercentage ?
                remChars.value / maxChars.value <= settings.store.charCountToShowCounterAt / 100
                : remChars.value <= settings.store.charCountToShowCounterAt
            : settings.store.interpretAsPercentage ?
                currChars.value / maxChars.value >= settings.store.charCountToShowCounterAt / 100
                : currChars.value >= settings.store.charCountToShowCounterAt;
    },
    get charCounterText() {
        return charCounterTemplate.join("");
    },
    start() {
        compileCharCounterTemplate(settings.store.characterCounterText);
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    }
});
