/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "UncompressedGateway",
    description: "Disables websocket compression so you can read Discord's gateway traffic in DevTools.",
    tags: ["Console", "Developers", "Utility"],
    authors: [Devs.Cootshk],
    patches: [
        {
            find: "isDiscordGatewayPlaintextSet(){",
            replacement: {
                match: /isDiscordGatewayPlaintextSet\(\)\{/,
                replace: "$&return true;"
            }
        }
    ]
});
