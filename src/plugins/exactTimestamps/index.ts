/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    showSeconds: {
        type: OptionType.BOOLEAN,
        description: "Show seconds in message timestamps",
        default: true
    }
});

export default definePlugin({
    name: "ExactTimestamps",
    description: "Shows exact message timestamps including seconds.",
    authors: [Devs.hashy143],
    settings,

    patches: [
        {
            find: "cozyAlt:",
            replacement: {
                match: /(\i)\?\(0,(\i\.i\$)\)\((\i),"LT",(\i)\):\(0,(\i\.mk)\)\(\3,!0\)/,
                replace: "$1?(0,$2)($3,$self.token(),$4):$self.cozy($3,(0,$5)($3,!0))"
            }
        }
    ],

    token() {
        return settings.store.showSeconds ? "LTS" : "LT";
    },

    cozy(date: Date, text: string) {
        if (!settings.store.showSeconds) return text;
        const ss = String(date.getSeconds()).padStart(2, "0");
        return text.replace(/(\d{1,2}[:.]\d{2})(?!.*\d[:.]\d{2})/, `$1:${ss}`);
    }
});
