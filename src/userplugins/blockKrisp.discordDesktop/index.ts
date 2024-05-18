/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "BlockKrisp",
    description: "Prevent Krisp from loading",
    authors: [Devs.D3SOX],
    patches: [
        {
            find: "Failed to load Krisp module",
            replacement: {
                match: /await (\i).default.ensureModule\("discord_krisp"\)/,
                replace: "throw new Error();await $1.default.ensureModule(\"discord_krisp\")"
            }
        }
    ],
});
