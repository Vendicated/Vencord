/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findOption } from "@api/Commands";
import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    translateMyMessages: {
        type: OptionType.BOOLEAN,
        description: "Translate all of your outgoing messages to Spamton speak",
        default: false,
        restartNeeded: false
    },
    intensity: {
        type: OptionType.NUMBER,
        description: "How many [HYPERLINK BLOCKED] to inject (1-5)",
        default: 2,
        restartNeeded: false
    }
});

const FILLERS = ["[HYPERLINK BLOCKED]", "(%#@&!)", "[KROMER]", "[DEAL]", "[BIG SHOT]", "!!", "[HELP]"];

function spamtonify(text: string): string {
    let out = text
        .replace(/\b(deal|deals)\b/gi, "[DEAL]")
        .replace(/\bbig shot\b/gi, "[BIG SHOT]")
        .replace(/\bmoney\b/gi, "[KROMER]")
        .replace(/\bheart\b/gi, "[Heart Shaped Object]")
        .replace(/\bplease\b/gi, "[PLEASE]")
        .replace(/\bno\b/gi, "[NO!]");
    out = out.toUpperCase();
    const n = Math.max(1, Math.min(5, Math.round(settings.store.intensity)));
    for (let i = 0; i < n; i++) {
        const f = FILLERS[Math.floor(Math.random() * FILLERS.length)];
        out += " " + f;
    }
    if (Math.random() < 0.4) out += " GIVE ME YOUR [KROMER]!";
    return out;
}

export default definePlugin({
    name: "Spamtonify",
    description: "Turn your messages into [HYPERLINK BLOCKED] Spamton speak. DEALS! DEALS! DEALS!",
    authors: [Devs.Ven, Devs.Claw],
    settings,

    commands: [
        {
            name: "spamton",
            description: "Translate text into Spamton's speech pattern",
            options: [
                {
                    name: "text",
                    description: "Text to Spamton-ify",
                    required: true,
                    type: 3
                }
            ],
            execute: args => {
                const text = findOption(args, "text", "") as string;
                return { content: spamtonify(text) };
            }
        }
    ],

    start() {
        this.preSend = addMessagePreSendListener((_channelId, message) => {
            if (!settings.store.translateMyMessages) return;
            if (message.content && !message.content.startsWith("/")) {
                message.content = spamtonify(message.content);
            }
        });
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
    }
});
