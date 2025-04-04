/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "DisableDeepLinks",
    description: "Disables Discord stupid DeepLinks experiment which makes the app unusable",
    authors: [Devs.Ven],
    required: true,

    patches: [{
        find: "2025-03_desktop_deeplinks",
        replacement: {
            match: /config:{enabled:!0/,
            replace: "config:{enabled:!1",
        }
    }]
});
