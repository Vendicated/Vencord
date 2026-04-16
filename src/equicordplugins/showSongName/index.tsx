/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ShowSongName",
    description: "Shows song name instead of artist for Spotify activity",
    authors: [Devs.prism],

    patches: [
        {
            find: '.join(", ");return{text:',
            replacement: {
                match: /(?<=.join\(", "\);return\{text:)\i/,
                replace: "arguments[0]?.details??$&"
            }
        }
    ]
});
