/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { loadCategories } from "./data";

export default definePlugin({
    name: "BetterGifCategories",
    description: "Organize your favorite GIFs into custom categories.",
    authors: [Devs.marpfie],
    tags: ["Media", "Customisation"],

    async start() {
        await loadCategories();
    },
});

