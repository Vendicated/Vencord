/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { playAudio } from "@api/AudioPlayer";
import { EquicordDevs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";

async function readOutText(text: string): Promise<void> {
    const mp3Response = await fetch("https://tiktok-tts.weilnet.workers.dev/api/generation", {
        body: JSON.stringify({ text: text, voice: "en_us_001" }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
    });

    const mp3JSON = await mp3Response.json();
    playAudio(`data:audio/mpeg;base64,${mp3JSON.data}`, { volume: 50 });
}

export default definePlugin({
    name: "TiktokTTS",
    description: "Reads out chat messages with the good ol' Tiktok TTS voice :sob:",
    authors: [EquicordDevs.VillainsRule],
    dependencies: ["AudioPlayerAPI"],
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message }) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content || message.content.length < 1 || message.content.length > 300) return;
            if (message.channel_id !== getCurrentChannel()?.id) return;

            readOutText(message.content);
        }
    }
});
