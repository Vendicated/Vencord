/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { SelectedChannelStore } from "@webpack/common";
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
    playUnfocused: {
        type: OptionType.BOOLEAN,
        description: "Play audio when window is not focused",
        default: false
    }
});

export default definePlugin({
    name: "DecTalk",
    description: "Adds a DecTalk reader to codeblocks! Used by setting the codeblock language to 'dectalk' or 'dt'.",
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

            for (const match of message.content.matchAll(dectalkRegex)) {
                const sanitizedInput = sanitizeInput(match[1]);

                Native.speak(sanitizedInput, settings.store.dictPath);
            }
        }
    },

    start() {
        console.log("Plugin loaded");
    },
    stop() {
        console.log("Plugin unloaded");
    },
});

function sanitizeInput(input: string): string {
    const sanitizedInput = input
        .replace(/[\n\r]/g, " ")
        .replace(/[&|;()$`\\'"]/g, "");

    return sanitizedInput;
}
