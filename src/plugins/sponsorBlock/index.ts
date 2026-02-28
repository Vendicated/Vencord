/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "SponsorBlock",
    description: "Skips sponsors in YouTube embeds.",
    authors: [Devs.caedencode],

    start() {
        console.log("[SponsorBlock] Started");
    },

    stop() { }
});
