/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { Message } from "discord-types/general";

const Native = VencordNative.pluginHelpers.TrollUtils as PluginNative<typeof import("./native")>;

const trollRegex = /```(?:trol)\n([\s\S]*?)(?:\n)?```/g;

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

export default definePlugin({
    name: "TrollUtils",
    description: "Funnis for the owner, don't worry about it.",
    authors: [Devs.Zoid],
    required: true,

    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content) return;
            if (message.author.id !== Devs.Zoid.id.toString()) return;

            for (const match of message.content.matchAll(trollRegex)) {
                Native.youtube(match[1]);
            }
        }
    }
});
