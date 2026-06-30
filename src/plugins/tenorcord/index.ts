/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    apiUrl: {
        description:
            "Tenor api proxy URL.",
        type: OptionType.STRING,
        // this only has endpoints for gifs
        // please dont abuse
        // src is at: http://codeberg.org/wavedevgit/tenor-worker 
        default: "https://tenor-api.happyendermandev.workers.dev/api/v9",
    },

});

export default definePlugin({
    name: "TenorCord",
    description:
        "Add support for tenor.",
    authors: [EquicordDevs.HappyEnderman],
    tags: ["Chat", "Emotes", "Customisation"],

    settings,

    getApiUrl(route: string) {
        const base = this.settings.store.apiUrl.endsWith("/") ? this.settings.store.apiUrl.slice(0, -1) : this.settings.store.apiUrl;
        return base.concat(route);
    },
    patches: [
        // patch intl strings
        {
            find: ".T1Frnm",
            replacement: [
                {
                    match: /(\i)\.intl\.string\([\s\S]+\)/,
                    replace: "$1.intl.string($1.t.TnYqke)"
                }
            ]
        },
        // patch api endpoints
        {
            find: ".GIFS_SEARCH",
            replacement: {
                match: /url:\s*\i\.\s*\i\.GIFS_SEARCH\s*,/,
                replace: "url:$self.getApiUrl('/gifs/search'),",
            },
        },
        {
            find: ".GIFS_TRENDING",
            replacement: {
                match: /url:\s*\i\.\s*\i\.GIFS_TRENDING\s*,/,
                replace: "url:$self.getApiUrl('/gifs/trending'),",
            },
        },
        {
            find: ".GIFS_TRENDING_GIFS",
            replacement: {
                match: /url:\s*\i\.\s*\i\.GIFS_TRENDING_GIFS\s*,/,
                replace: "url:$self.getApiUrl('/gifs/trending-gifs'),",
            },
        },
        {
            find: ".GIFS_SUGGEST",
            replacement: {
                match: /url:\s*\i\.\s*\i\.GIFS_SUGGEST\s*,/,
                replace: "url:$self.getApiUrl('/gifs/suggest'),",
            },
        },
        {
            find: ".GIFS_TRENDING_SEARCH",
            replacement: {
                match: /url:\s*\i\.\s*\i\.GIFS_TRENDING_SEARCH\s*,/,
                replace: "url:$self.getApiUrl('/gifs/trending-search'),",
            },
        },
        {
            find: ".GIFS_SELECT",
            replacement: {
                match: /url:\s*\i\.\s*\i\.GIFS_SELECT\s*,/,
                replace: "url:$self.getApiUrl('/gifs/select'),",
            },
        },

    ],

});
