/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import style from "./styles.css?managed";

import { Devs } from "@utils/constants";
import { enableStyle } from "@api/Styles";
import definePlugin from "@utils/types";

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
            {
                match: /\i\.length>1/,
                replace: "false",
            },
        ],
    }],
    start() {
        enableStyle(style);
    }
});
