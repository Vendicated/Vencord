/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    ezPFP: {
        type: OptionType.BOOLEAN,
        description: "Enable EzPFP",
        default: true
    },
    partyMode: {
        type: OptionType.BOOLEAN,
        description: "Enable Party Mode",
        default: false
    }
});

console.log("EzPFP FILE LOADED");

export default definePlugin({
    name: "EzPFP",
    description: "Tired of rechanging and rechecking your profile picture until it feels right?, This plugin will allow you to preview your profile picture in different contexts and sizes before saving it.",
    authors: [Devs.RandomCat],
    settings,
    patches: [
        {
            find: /\i\.intl\.string\(\i\.\i#{intl::Br1ls3::raw}\)/,
            replacement: {
                match: /(\i\.intl\.string\(\i\.\i#{intl::Br1ls3::raw}\))/,
                replace: "$self.doThing($1)",
            },
        },
    ],

    doThing(original) {
        console.log("BLEEEH BLEH:", original);
        return original;
    },
});

function ReactComponent() {
    const { ezPFP } = settings.use(["ezPFP"]);

    return <div>{ezPFP ? "EzPFP is enabled" : "EzPFP is disabled"}</div>;
}
