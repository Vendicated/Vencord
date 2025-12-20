/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "FixCodeblockGap",
    description: "Removes the gap between codeblocks and text below it",
    authors: [Devs.Grzesiek11],
    patches: [
        {
            find: String.raw`/^${"```"}(?:([a-z0-9_+\-.#]+?)\n)?\n*([^\n][^]*?)\n*${"```"}`,
            replacement: {
                match: String.raw`/^${"```"}(?:([a-z0-9_+\-.#]+?)\n)?\n*([^\n][^]*?)\n*${"```"}`,
                replace: "$&\\n?",
            },
        },
    ],
});
