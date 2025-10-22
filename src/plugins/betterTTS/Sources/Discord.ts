/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AbstractTTSSource } from "./AbstractSource";

export default new class DiscordTTS extends AbstractTTSSource<SpeechSynthesisUtterance> {

    getDefaultVoice() {
        return speechSynthesis.getVoices()[0].voiceURI;
    }

    async retrieveVoices() {
        const voices = speechSynthesis.getVoices();
        this.voicesLabels = voices
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(voice => ({
                label: voice.name,
                value: voice.voiceURI
            }));
        return this.voicesLabels;
    }

    async getMedia(text: string) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = speechSynthesis.getVoices().find(v => v.voiceURI === this.selectedVoice) || speechSynthesis.getVoices()[0];
        return utterance;
    }
};
