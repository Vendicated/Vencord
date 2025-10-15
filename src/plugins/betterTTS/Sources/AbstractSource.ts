/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TTSSourceInterface, TTSVoice, TTSVoiceOption } from "../types/ttssource";

export abstract class AbstractTTSSource<T extends HTMLAudioElement | SpeechSynthesisUtterance> implements TTSSourceInterface<T> {
    constructor() {
        const retrive = async () => {
            console.log("Retrieving voices...");
            this.voicesLabels = await this.retrieveVoices();
            if (this.voicesLabels.length === 0) {
                setTimeout(retrive, 5000);
            }
        };
        retrive();
    }

    protected voicesLabels: TTSVoiceOption[] = [];
    protected selectedVoice: TTSVoice = "";

    abstract retrieveVoices(): Promise<TTSVoiceOption[]>;

    abstract getDefaultVoice(): TTSVoice;

    getVoices(): TTSVoiceOption[] {
        return this.voicesLabels;
    }

    setVoice(voice: TTSVoice): void {
        this.selectedVoice = voice;
    }

    abstract getMedia(text: string): Promise<T>;
}
