/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    source: {
        description: "Source to replace loading video with",
        type: OptionType.STRING,
        default: "https://cdn.discordapp.com/attachments/1015063227299811479/1149861257558638623/1024751291504791654.webm",
    },
    overrideTextOffset: {
        description: "Override the text's \"top\" property specified with CSS",
        type: OptionType.BOOLEAN,
        default: true
    },
    textOffset: {
        description: "Text Y offset (PX)",
        type: OptionType.NUMBER,
        default: 5
    }
});

export default definePlugin({
    name: "CustomSplash",
    description: "Replace Discord's loading animation.",
    authors: [Devs.TheKodeToad],
    patches: [
        {
            find: "\"data-testid\":\"app-spinner\"",
            replacement: {
                match: /(?<="data-testid":"app-spinner",children:)\i/,
                replace: "$self.isSourceAvailable() ? $self.LoadingSource() : $&"
            }
        },
        {
            find: "\"UPDATED_QUOTES\"",
            replacement: {
                match: /\("div",{className:\i\(\)\.text,(?=children:.{0,100}\.tipTitle)/,
                replace: "$&style: $self.getTextStyle(),"
            }
        }
    ],
    settings,
    isSourceAvailable: () => settings.store.source.length > 0,
    getTextStyle: () => ({ top: settings.store.overrideTextOffset ? settings.store.textOffset : void 0 }),
    LoadingSource: () => <source src={settings.store.source} />
});
