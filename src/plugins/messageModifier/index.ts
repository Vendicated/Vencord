/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePlugin } from "@utils/types";
import { MessageActions } from "@webpack/common";

export default definePlugin({
    name: "MessageModifier",
    description: "Modifies outgoing messages with custom suffixes.",
    authors: [Devs.ikito],
    settings: {
        suffix: {
            type: "string",
            default: " (sent via Vencord)",
            description: "The text to append to your messages",
        }
    },
    patches: [
        {
            find: "sendMessage:{",
            replacement: {
                match: /sendMessage:function\(\w+,(\w+)\)/,
                replace: "sendMessage:function(e,$1){$1.content+=(plugin.settings.suffix.get()??' (sent via Vencord)');"
            }
        }
    ]
});
