/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/index";
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

const logger = new Logger("EzPFP", "#a6d189");

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
                replace: "$self.doThat($1)",
            },
        },
        {
            find: /\i\.intl\.string\(\i\.\i#{intl::uvGmCx::raw}\)/,
            replacement: {
                match: /(#{intl::uvGmCx::raw}.{0,600}?className:\i,children:)(\i)(?=,|}\))/,
                replace: "$1[$2,$self.renderTimer({})]",
            },
        },
    ],

    renderTimer: () => {
        logger.log("NYAAAAAAAAAAAAAA");
        return (
            <p style={{ margin: 0, fontFamily: "var(--font-code)" }}>
                test text bleh
            </p>
        );
    },

    doThat(a) {
        logger.log("BLEEEH BLEH:", a);
        return a;
    },
});

function ReactComponent() {
    const { ezPFP } = settings.use(["ezPFP"]);

    return <div>{ezPFP ? "EzPFP is enabled" : "EzPFP is disabled"}</div>;
}
