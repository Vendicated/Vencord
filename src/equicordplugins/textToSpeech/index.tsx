/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import OpenAI from "openai";
let openai;

const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "Your OpenAI API Key",
        default: "",
        restartNeeded: true
    },
    voiceToUse:
    {
        type: OptionType.SELECT,
        description: "The text to speech voice to use",
        options: [
            { value: "alloy", label: "Alloy" },
            { value: "echo", label: "Echo" },
            { value: "fable", label: "Fable" },
            { value: "onyx", label: "Onyx" },
            { value: "nova", label: "Nova", default: true },
            { value: "shimmer", label: "Shimmer" }
        ]
    }
});

async function readOutText(text) {

    const mp3Response = await openai.audio.speech.create({
        model: "tts-1",
        voice: settings.store.voiceToUse,
        input: text,
    });

    const mp3Data = await mp3Response.arrayBuffer();

    const mp3Blob = new Blob([mp3Data], { type: "audio/mpeg" });

    const audioElement = new Audio();

    const audioURL = URL.createObjectURL(mp3Blob);

    audioElement.src = audioURL;
    audioElement.volume = 0.5;

    document.body.appendChild(audioElement);

    audioElement.play();
}


export default definePlugin({
    name: "TextToSpeech",
    description: "Reads out chat messages with openai tts",
    authors: [Devs.Samwich],
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content) return;
            if (message.channel_id !== getCurrentChannel()?.id) return;

            readOutText(message.content);
        }
    },
    settings,
    start() {
        openai = new OpenAI({ apiKey: settings.store.apiKey, dangerouslyAllowBrowser: true });
    }
});
