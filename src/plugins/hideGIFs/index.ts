/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import definePlugin from "@utils/types";

import managedStyle from "./style.css?managed";

const cl = classNameFactory("vc-hide-gifs-");

export default definePlugin({
    name: "HideGIFs",
    description: "Blurs all GIFs in chat until hovered over",
    authors: [{ id: 1455425684749946881n, name: "mariontop" }],
    tags: ["Media", "Privacy", "Utility"],

    managedStyle,

    patches: [
        {
            find: "}renderStickersAccessories(",
            replacement: {
                match: /(\.renderReactions\(\i\).+?className:)/,
                replace: `$&"${cl("container")} "+`
            }
        }
    ]
});
