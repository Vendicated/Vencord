/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const cl = classNameFactory("vc-charcounter-");
let maxChars = 2000;
let currChars = 0;

const settings = definePluginSettings({
    characterCounterText: {
        type: OptionType.STRING,
        description: "$m = Max character count, $c = Current character count, $r = Remaining character count, \\ = Escape character",
        default: "$c/$m, $r characters remaining"
    },
    alwaysShowCharacterCounter: {
        type: OptionType.BOOLEAN,
        description: "Always show the character counter, regardless of the remaining character count.",
        default: true
    },
    maxRemainingCharCount: {
        type: OptionType.NUMBER,
        description: "Only show character counter when remaining character count is less than or equal to:",
        default: 10
    },
    interpretAsPercentage: {
        type: OptionType.SELECT,
        description: "",
        options: [
            { label: "% of max character count", value: true, default: true },
            { label: "characters", value: false }
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
                    replace: "$self.CharCounter"
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
        return settings.store.alwaysShowCharacterCounter || (settings.store.interpretAsPercentage ?
            (maxChars - currChars) / maxChars <= settings.store.maxRemainingCharCount / 100
            : maxChars - currChars <= settings.store.maxRemainingCharCount);
    },
    get CharCounter() {
        return (
            <span className={cl("text")}>
                {settings.store.characterCounterText
                    .replaceAll(/(?<!(?:^|[^\\])\\(?:\\\\)*)\$[mM]/g, maxChars.toString())
                    .replaceAll(/(?<!(?:^|[^\\])\\(?:\\\\)*)\$[cC]/g, currChars.toString())
                    .replaceAll(/(?<!(?:^|[^\\])\\(?:\\\\)*)\$[rR]/g, (maxChars - currChars).toString())
                    .replaceAll(/\\(.|$)/g, "$1")}
            </span>
        );
    }
});
