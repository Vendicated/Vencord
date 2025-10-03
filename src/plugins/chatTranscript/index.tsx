/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { contextMenus } from "./contextMenus";
import { settings } from "./settings";

export default definePlugin({
    name: "Chat Transcript",
    description: "Export Discord transcripts with advanced filters, ranges and formatting options.",
    authors: [Devs.Naseem],
    settings,
    contextMenus
});
