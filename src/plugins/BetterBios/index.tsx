/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "BetterBios",
    description: "Removes the readable line limit on user profiles.",
    authors: [Devs.Byron],
    patches: [{
        find:
            "-webkit-line-clamp: 6;",
        replacement: {
            match: /"-webkit-line-clamp: 6;"/,
            replace: "-webkit-line-clamp: 99 !important;"
        }

    }]
});
