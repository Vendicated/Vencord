/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import style from "./styles.css?managed";

export default definePlugin({
    name: "NoMosaic",
    authors: [Devs.AutumnVN],
    description: "Removes Discord new image mosaic",
    tags: ["image", "mosaic", "media"],
    patches: [{
        find: "Media Mosaic",
        replacement: [
            {
                match: /mediaLayoutType:\i\.\i\.MOSAIC/,
                replace: 'mediaLayoutType:"RESPONSIVE"',
            },
            {
                match: /\i===\i\.\i\.MOSAIC/,
                replace: "true",
            },
            {
                match: /null!==\(\i=\i\.get\(\i\)\)&&void 0!==\i\?\i:"INVALID"/,
                replace: '"INVALID"',
            },
        ],
    }],
    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    }
});
