/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { SelectedChannelStore, UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

const dectalkRegex = /```(?:dt|dectalk)\n([\s\S]*?)(?:\n)?```/g;

const settings = definePluginSettings({
    userBlockList: {
        type: OptionType.STRING,
        description: "Comma-separated list of user IDs to block",
        default: ""
    },
    playUnfocused: {
        type: OptionType.BOOLEAN,
        description: "Play audio when window is not focused",
        default: false
    },
    playAllMessages: {
        type: OptionType.BOOLEAN,
        description: "Play audio for all messages, regardless of content (will ignore code blocks)",
        default: false
    },
    volume: {
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        description: "Volume of the DecTalk audio",
        default: 1
    }
});

async function getAudio(text) {
    try {
        const response = await fetch("https://api.zoid.one/dectalk/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error("failed to fetch audio");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audio.volume = settings.store.volume;

        audio.onended = () => {
            URL.revokeObjectURL(url);
            audio.remove();
            console.log("audio finished and deleted");
        };

        return audio;
    } catch (err) {
        console.error("error:", err);
    }
}

export default definePlugin({
    name: "DecTalk",
    description: "Adds a DecTalk reader to Discord. Only reads messages in code blocks with the language set to 'dt' or 'dectalk' by default.",
    nexulien: true,
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

            const audios: HTMLAudioElement[] = [];

            if (settings.store.playAllMessages) {
                const text = message.content
                    .replace(/```[\s\S]*?```/g, "")
                    .replace(/https?:\/\/\S+/g, "");
                const audio = await getAudio(text);
                if (audio) audios.push(audio);
            } else {
                for (const match of message.content.matchAll(dectalkRegex)) {
                    const text = match[1];
                    const audio = await getAudio(text);
                    if (audio) audios.push(audio);
                }
            }

            if (audios.length > 0) {
                await Promise.all(audios.map(audio => {
                    document.body.appendChild(audio);
                }));

                audios.forEach(audio => { audio.play(); });
                audios.forEach(audio => audio.currentTime = 0);
            }
        }
    },
});

const getUserId = () => {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) throw new Error("User not yet logged in");
    return id;
};
