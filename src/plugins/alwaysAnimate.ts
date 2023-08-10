/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "AlwaysAnimate",
    description: "Animates anything that can be animated, besides status emojis.",
    authors: [Devs.FieryFlames],

    patches: [
        {
            find: ".canAnimate",
            all: true,
            replacement: {
                match: /\.canAnimate\b/g,
                replace: ".canAnimate || true"
            }
        }
    ]
});
