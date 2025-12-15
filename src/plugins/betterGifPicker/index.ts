/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let closeSuppressCount = 0;
const settings = definePluginSettings({
    keepOpen: {
        description: "Keeps the gif picker open after selecting a gif",
        type: OptionType.BOOLEAN,
        default: false
    },
});

export default definePlugin({
    name: "BetterGifPicker",
    description: "Makes the gif picker open the favourite category by default",
    authors: [Devs.Samwich, EquicordDevs.justjxke],
    isModified: true,
    settings,
    patches: [
        {
            find: '"state",{resultType:',
            replacement: [{
                match: /(?<="state",{resultType:)null/,
                replace: '"Favorites"'
            }]
        },
        {
            find: "#{intl::NO_GIF_FAVORITES_HOW_TO_FAVORITE}",
            predicate: () => settings.store.keepOpen,
            replacement: [
                {
                    match: /null!=\i&&\i\(\i\),/,
                    replace: "$self.onGifSelect(),$&"
                },
                {
                    match: /\i\.scrollIntoViewRect\(\{/,
                    replace: "$self.shouldSuppressGifFocusScroll()||$&"
                },
                {
                    match: /this.renderGIF\(\).{0,50}\]/,
                    replace: "$&,onMouseDown:e=>{$self.shouldSuppressGifFocusScroll()&&e.preventDefault()}"
                }
            ]
        },
        {
            find: "expression-picker-last-active-view",
            replacement: {
                match: /\i\.setState\(\{activeView:null/,
                replace: "$self.consumeCloseSuppress()||$&"
            }
        },
    ],

    onGifSelect() {
        if (!settings.store.keepOpen) return;
        closeSuppressCount = 2;
    },

    consumeCloseSuppress() {
        if (!settings.store.keepOpen) {
            closeSuppressCount = 0;
            return false;
        }

        if (closeSuppressCount <= 0) return false;
        closeSuppressCount--;
        return true;
    },

    shouldSuppressGifFocusScroll() {
        return settings.store.keepOpen;
    }
});
