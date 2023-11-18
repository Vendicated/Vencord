/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let maxChars = 2000;
let currChars = 0;

const settings = definePluginSettings({
    characterCounterText: {
        type: OptionType.STRING,
        description: "$m = Max character amount, $c = Current character amount, $r = Remaining character amount, \\ = Escape character",
        default: "$c/$m, $r characters remaining"
    },
    useMonospacedFont: {
        type: OptionType.BOOLEAN,
        description: "Makes the character counter's font monospaced.",
        default: false
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
                    replace: "!1"
                },
                {
                    match: /\(\i\.Tooltip,{text:\i,/,
                    replace: "$&shouldShow:!1,"
                },
                {
                    match: /(?<=\("span",{(?:[^}]*,)?children:)\i(?=}|,)/,
                    replace: "$self.charCounter"
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
    get charCounter() {
        return (
            <span
                style={{
                    fontFamily: settings.store.useMonospacedFont ? "var(--font-code, revert)" : "revert",
                    position: "absolute",
                    right: "0",
                    bottom: "-32px",
                    whiteSpace: "nowrap"
                }}
            >
                {settings.store.characterCounterText
                    .replaceAll(/(?<!(?:^|[^\\])\\(?:\\\\)*)\$[mM]/g, maxChars.toString())
                    .replaceAll(/(?<!(?:^|[^\\])\\(?:\\\\)*)\$[cC]/g, currChars.toString())
                    .replaceAll(/(?<!(?:^|[^\\])\\(?:\\\\)*)\$[rR]/g, (maxChars - currChars).toString())
                    .replaceAll(/\\(.|$)/g, "$1")}
            </span>
        );
    }
});
