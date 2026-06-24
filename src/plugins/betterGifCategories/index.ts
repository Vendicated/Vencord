/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import {
    getCategoryTiles,
    getFavorites,
    getHeadingLabel,
    onSelectTile,
    patches,
    setGridInstance,
    setInstance
} from "./categoryView";
import { messageContextMenuPatch } from "./ContextMenu";
import { loadCategories } from "./data";

export default definePlugin({
    name: "BetterGifCategories",
    description: "Organize your favorite GIFs into custom categories.",
    authors: [Devs.marpfie],
    tags: ["Media", "Customisation"],

    patches,

    contextMenus: {
        "message": messageContextMenuPatch,
    },

    async start() {
        await loadCategories();
    },

    getCategoryTiles,
    getFavorites,
    getHeadingLabel,
    onSelectTile,
    setGridInstance,
    setInstance,
});

