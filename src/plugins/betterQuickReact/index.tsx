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
    columns: {
        description: "Columns of quick reactions to display",
        type: OptionType.SLIDER,
        default: 4,
        markers: makeRange(4, 10, 1),
        stickToMarkers: true
    },
    compactMode: {
        description: "Scales the buttons to 75% of their original scale, while increasing the emoji to 125% scale to stay visible. Recommended to have a minimum of 5 columns",
        type: OptionType.BOOLEAN,
        default: false
    }
});

export default definePlugin({
    name: "BetterQuickReact",
    description: "Improves the quick react buttons in the message context menu.",
    authors: [Devs.Ven, Devs.Sqaaakoi],
    settings,

    patches: [
        {
            find: "this.favoriteEmojisWithoutFetchingLatest.concat",
            replacement: {
                match: /(this\.favoriteEmojisWithoutFetchingLatest)\.concat/,
                replace: "($self.settings.store.frequentEmojis?[]:$1).concat"
            }
        },
        {
            find: "default.Messages.ADD_REACTION_NAMED.format",
            replacement: {
                match: /(\i)\.length>4&&\((\i)\.length=4\);/,
                replace: "$1.length>$self.getMaxQuickReactions()&&($2.length=$self.getMaxQuickReactions());"
            }
        },
        {
            find: "default.Messages.ADD_REACTION_NAMED.format",
            replacement: {
                match: /className:(\i)\.wrapper,/,
                replace: "className:\"vc-better-quick-react \"+($self.settings.store.compactMode?\"vc-better-quick-react-compact \":\"\")+$1.wrapper,style:{\"--vc-better-quick-react-columns\":$self.settings.store.columns},"
            }
        },
        // MenuGroup doesn't accept styles or anything special by default :/
        {
            find: "{MenuGroup:function()",
            replacement: {
                match: /role:"group",/,
                replace: "role:\"group\",style:arguments[0].style,"
            }
        }
    ],
    getMaxQuickReactions() {
        return settings.store.rows * settings.store.columns;
    }
});
