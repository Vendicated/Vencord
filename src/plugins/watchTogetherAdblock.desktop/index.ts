/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// The entire code of this plugin can be found in native.ts
export default definePlugin({
    name: "WatchTogetherAdblock",
    description: "Block ads in the YouTube WatchTogether activity via AdGuard",
    authors: [Devs.ImLvna],
});
