/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoDefaultHangStatus",
    description: "Disable the default hang status when joining voice channels",
    authors: [Devs.D3SOX],

    patches: [
        {
            find: "updateHangStatus:function",
            replacement: {
                match: /(?<=function \i\((\i),(\i)\)\{var \i;)if\(null==\i\)/,
                replace: "if(null==$1||$2===undefined)"
            }
        }
    ]
});
