/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ConcatenatedComponentExtractor",
    description: "",
    authors: [Devs.sadan],

    required: true,

    patches: [
        {
            find: "#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}),focusProps:",
            replacement: {
                match: /(?=function (\i)\(\i\)\{let\{[^}]+?showEyeDropper:)/,
                replace: "$self.registerColorPicker($1);"
            }
        }
    ],

    registerColorPicker(component: any) {
        // ???
    }
});
