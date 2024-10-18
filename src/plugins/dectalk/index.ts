/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { SelectedChannelStore, UserStore } from "@webpack/common";
import { Message } from "discord-types/general";


const Native = VencordNative.pluginHelpers.DecTalk as PluginNative<typeof import("./native")>;

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

const dectalkRegex = /```(?:dt|dectalk)\n([\s\S]*?)(?:\n)?```/g;

const settings = definePluginSettings({
    dictPath: {
        type: OptionType.STRING,
        description: "Path to DecTalk executable and dictionary",
        default: "C:/dectalk/"
    },
    userBlockList: {
        type: OptionType.STRING,
        description: "Comma-separated list of user IDs to block",
        default: ""
    },
    maxCodeblocks: {
        type: OptionType.NUMBER,
        description: "Maximum number of codeblocks to play at once",
        default: 5
    },
    playUnfocused: {
        type: OptionType.BOOLEAN,
        description: "Play audio when window is not focused",
        default: false
    }
});

export default definePlugin({
    name: "DecTalk",
    description: "Adds a DecTalk reader to codeblocks! Used by setting the codeblock language to 'dectalk' or 'dt'.",
    zoidcord: true,
    authors: [Devs.Zoid],

    settings,

    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;
            if (settings.store.userBlockList.includes(message.author.id)) return;
            if (!settings.store.playUnfocused && !document.hasFocus()) return;

            let count = 0;
            for (const match of message.content.matchAll(dectalkRegex)) {
                count++;
            }

            if (count >= settings.store.maxCodeblocks + 1) {
                if (message.author.id === getUserId()) showNotification({
                    title: "DecTalk",
                    body: "Too many codeblocks in one message!",
                });
                return;
            }

            for (const match of message.content.matchAll(dectalkRegex)) {
                const sanitizedInput = sanitizeInput(match[1]);

                Native.speak(sanitizedInput, settings.store.dictPath);
            }
        }
    },
});

function sanitizeInput(input: string): string {
    const sanitizedInput = input
        .replace(/[\n\r]/g, " ")
        .replace(/[&|;()$`\\'"]/g, "");

    return sanitizedInput;
}

const getUserId = () => {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) throw new Error("User not yet logged in");
    return id;
};
