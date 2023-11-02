/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { defineIpcPlugin } from "@utils/types";

export default defineIpcPlugin({
    name: "FixSpotifyEmbeds",
    matcher: /^https:\/\/open\.spotify\.com\/embed\//,

    entrypoint(settings) {
        const original = Audio.prototype.play;
        Audio.prototype.play = function () {
            this.volume = (settings.volume / 100) || 0.1;
            return original.apply(this, arguments);
        };
    }
});
