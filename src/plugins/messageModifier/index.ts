/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { patcher, webpack } from "@vendicated/patch";
import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";

// Target the specific module responsible for message sending
const MessageModule = webpack.getByProps("sendMessage", "editMessage");

export default definePlugin({
    name: "MessageModifier",
    description: "Modifies outgoing messages with custom suffixes.",
    authors: [Devs.ikito], // Using your official ID from constants.ts

    onStart() {
        // Intercepting 'sendMessage' to modify the content argument before it reaches Discord's servers
        patcher.before(MessageModule, "sendMessage", (args) => {
            const messageData = args[1];
            
            // Safety check: ensure content exists (prevents crashes on stickers/images)
            if (messageData && typeof messageData.content === "string") {
                messageData.content += " (sent via Vencord patch)";
            }
        });
    },

    onStop() {
        // Crucial: Cleaning up the patcher to ensure the client returns to its original state
        patcher.unpatchAll();
    }
});
