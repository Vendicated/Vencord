/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// The entire code of this plugin can be found in ipcPlugins
export default definePlugin({
    name: "WatchTogetherActivityAdblock",
    description: "Makes ads go away in the Youtube activity.",
    authors: [Devs.matiq],
    patches: [],
});