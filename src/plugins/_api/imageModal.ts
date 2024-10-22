/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "ImageModalAPI",
    authors: [Devs.sadan, Devs.Nuckyz],
    description: "Allows you to open Image Modals",
    patches: [
        {
            find: "SCALE_DOWN:",
            replacement: {
                match: /!\(null==(\i)\|\|0===\i\|\|null==(\i)\|\|0===\i\)/,
                replace: (_, width, height) => `!((null == ${width} || 0 === ${width}) && (null == ${height} || 0 === ${height}))`
            }
        }
    ]
});
