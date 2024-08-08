/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// The entire code of this plugin can be found in native.ts
migratePluginSettings("YoutubeAdblock", "WatchTogetherAdblock");
export default definePlugin({
    name: "YoutubeAdblock",
    description: "Block ads in YouTube embeds and the WatchTogether activity via AdGuard",
    authors: [Devs.ImLvna, Devs.Ven],
});
