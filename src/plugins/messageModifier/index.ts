/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { patcher, webpack } from "@vendicated/patch";
import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";

const MessageModule = webpack.getByProps("sendMessage", "editMessage");

export default definePlugin({
    name: "MessageModifier",
    description: "Modifies outgoing messages with custom suffixes.",
    authors: [Devs.ikito],

    onStart() {
        patcher.before(MessageModule, "sendMessage", (args) => {
            const messageData = args[1];
            
            if (messageData && typeof messageData.content === "string") {
                messageData.content += " (sent via Vencord patch)";
            }
        });
    },

    onStop() {
        patcher.unpatchAll();
    }
});
