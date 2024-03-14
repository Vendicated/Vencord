/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./index.css";

import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    frequentEmojis: {
        description: "Use top frecency emojis instead of favourite emojis",
        type: OptionType.BOOLEAN,
        default: true
    },
    rows: {
        description: "Rows of quick reactions to display",
        type: OptionType.SLIDER,
        default: 2,
        markers: makeRange(1, 16, 1),
        stickToMarkers: true
    },
});

export default definePlugin({
    name: "BetterQuickReact",
    description: "Improves the quick react buttons in the message context menu.",
    authors: [Devs.Ven, Devs.Sqaaakoi],
    settings,

    patches: [
        {
            find: "this.favoriteEmojisWithoutFetchingLatest.concat",
            predicate: () => settings.store.frequentEmojis,
            replacement: {
                match: "this.favoriteEmojisWithoutFetchingLatest.concat",
                replace: "[].concat"
            }
        },
        {
            find: "default.Messages.ADD_REACTION_NAMED.format",
            replacement: {
                match: /(\i)\.length>4&&\((\i)\.length=4\);/,
                replace: "$1.length>$self.getMaxQuickReactions()&&($2.length=$self.getMaxQuickReactions());"
            }
        }
    ],
    getMaxQuickReactions() {
        return settings.store.rows * 4;
    }
});
