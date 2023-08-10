/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "AlwaysTrust",
    description: "Removes the annoying untrusted domain and suspicious file popup",
    authors: [Devs.zt],
    patches: [
        {
            find: ".displayName=\"MaskedLinkStore\"",
            replacement: {
                match: /\.isTrustedDomain=function\(.\){return.+?};/,
                replace: ".isTrustedDomain=function(){return true};"
            }
        },
        {
            find: '"7z","ade","adp"',
            replacement: {
                match: /JSON\.parse\('\[.+?'\)/,
                replace: "[]"
            }
        }
    ]
});
