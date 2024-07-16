/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and nin1275
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "Signature message",
    description: "Adds a custom signature text under every message u send.",
    authors: [Devs.nin1275, Devs.immrb],
    dependencies: ["MessageEventsAPI"],
    settings: definePluginSettings({
        Enable: {
            description: "Send the signature message?",
            type: OptionType.BOOLEAN,
            default: true,
        },
        Message: {
            description: "Signature Message",
            type: OptionType.STRING,
            default: "Check out my website! https://nin1275.xyz/"
        }
    }),
    async start() {
        this.preSend = addPreSendListener((channelId, msg) => {
            if (this.settings.store.Enable) {
                const newContent = msg.content + "\n" + "-# " + this.settings.store.Message;
                msg.content = newContent;
            }
        });
    },
    stop() {
        removePreSendListener(this.preSend);
    }
});
