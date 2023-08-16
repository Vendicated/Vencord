/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants.js";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "TwitterIcon",
    authors: [Devs.TheSun],
    description: "Adds the bird back in the Connections menu",

    patches: [{
        find: "getByUrl:function",
        replacement: {
            match: /get:function\((\i)\){/,
            replace: "$&if($1===\"twitter\")$1=\"twitter_legacy\";"
        }
    }]
});
