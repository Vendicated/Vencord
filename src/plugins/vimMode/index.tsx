/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { VimEngine } from "./vim";

const vim = new VimEngine();

export default definePlugin({
    name: "VimMode",
    description: "Vim-style keybindings for Discord, with modes, motions",
    authors: [Devs.iamvpk],
    start() {
        vim.start();
    },
    stop() {
        vim.stop();
    }
});
