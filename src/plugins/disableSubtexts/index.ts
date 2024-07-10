/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "disableSubtexts",
    description: "A plugin to disable subtexts as they can be used to scam you.",
    authors: [Devs.HappyEnderman],
    patches: [
        {
            find: `/^ *-# +`,
            replacement: {
                match: /match:\(.+?\)=>{.+\.match\(\i\)?.+\.anyScopeRegex\)\(\i\)\(\i,\i,\i\):null:null}/,
                replace: "match:()=>null"
            }
        }
    ],
});
