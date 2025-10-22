/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AbstractTTSSource } from "./AbstractSource";

type StreamElementsVoice = {
    gender: string;
    id: string;
    languageName: string;
    languageCode: string;
    name: string;
    provider: string;
};

export default new class StreamElementsTTS extends AbstractTTSSource<HTMLAudioElement> {
    getDefaultVoice() {
        return "Brian";
    }

    async retrieveVoices() {
        try {
            const response = await fetch("https://api.streamelements.com/kappa/v2/speech/voices");
            if (!response.ok) {
                throw new Error("Failed to load voices");
            }
            const data = await response.json();
            const voices = data.voices as Record<string, StreamElementsVoice>;
            this.voicesLabels = Object.values(voices)
                .sort((a, b) => a.languageName.localeCompare(b.languageName))
                .map((voice: StreamElementsVoice) => ({
                    label: `${voice.name} (${voice.languageName} ${voice.languageCode})`,
                    value: voice.id
                }));
        } catch (error) {
            throw new Error("Failed to load voices");
        }
        return this.voicesLabels;
    }

    async getMedia(text: string) {
        return new Promise<HTMLAudioElement>((resolve, reject) => {
            text = encodeURIComponent(text);
            const url = `https://api.streamelements.com/kappa/v2/speech?voice=${this.selectedVoice}&text=${text}`;
            const audio = new Audio(url);
            audio.addEventListener("loadeddata", () => resolve(audio));
            audio.addEventListener("error", () => reject(new Error("Failed to load audio")));
        });
    }
};
