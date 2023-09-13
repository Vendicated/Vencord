/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "RandomQuotes",
    description: "Replace Discord's default loading quotes with random facts, don't enable it with any other plugin that modifies loading quotes like LoadingQuotes!",
    authors: [Devs.DarkRedTitan],
    patches: [
        {
            find: ".LOADING_DID_YOU_KNOW",
            replacement: {
                match: /;(.{0,10}?\._loadingText)=.+?random\(.+?;/s,
                replace: ";$self.quote().then(quoteText => $1 = quoteText);",
            },
        },
    ],

    async quote() {
        const url = "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en";
        return fetch(url).then(res => res.json()).then(json => { return json.text; });
    }
});
