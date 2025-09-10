/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "DuckDuckGoSearch",
    description: "Replaces Search with Google with Search with DuckDuckGo.",
    authors: [Devs.YoureIronic],

    patches: [
        {
            find: "https://www.google.com/search?q=",
            replacement: {
                match: /https:\/\/www\.google\.com\/search\?q=/g,
                replace: "https://duckduckgo.com/?q="
            }
        },
        {
            find: "Search with Google",
            replacement: {
                match: /Search with Google/g,
                replace: "Search with DuckDuckGo"
            }
        }
    ],

    start() {
        console.log("SearchWithDuckDuckGo plugin started!");
    },

    stop() {
        console.log("SearchWithDuckDuckGo plugin stopped!");
    }
});