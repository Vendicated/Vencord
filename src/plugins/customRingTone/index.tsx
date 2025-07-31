/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { parseUrl } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";

const RINGTONE_NAMES = ["call_ringing", "call_ringing_beat", "call_ringtone"];

const settings = definePluginSettings({
    customURL: {
        type: OptionType.STRING,
        description: "Custom ringtone's URL (supports catbox.moe and Discord links)",
        restartNeeded: false,
        default: "https://files.catbox.moe/93w4jy.mp3"
    }
});

export default definePlugin({
    name: "CustomRingTone",
    description: "Add and use your own custom ringtone.",
    authors: [Devs.kz],
    settings,

    audio: null as HTMLAudioElement | null,

    async loadAudio(url: any) {
        try {
            if (this.audio) {
                this.audio.pause();
                this.audio.src = "";
                this.audio = null;
            }

            this.audio = new Audio(url);
            this.audio.volume = 0.5;
            this.audio.loop = true;

            return new Promise<void>((resolve, reject) => {
                if (!this.audio) return reject("No audio element");

                this.audio.oncanplaythrough = () => resolve();

                this.audio.onerror = e => {
                    console.error("[CustomRingTone] Failed to load audio:", e);
                    this.audio = null;
                    reject(e);
                };

                this.audio.load();
            });
        } catch (e) {
            console.error("[CustomRingTone] Error loading audio:", e);
            this.audio = null;
            throw e;
        }
    },

    playAudio() {
        if (!this.audio) return false;

        try {
            this.audio.currentTime = 0;

            this.audio.play()
                .catch(e => {
                    console.error("[CustomRingTone] Error playing audio:", e);
                    const playOnClick = () => {
                        if (this.audio) {
                            this.audio.play()
                                .catch(e => console.error("[CustomRingTone] Still failed to play audio after user interaction:", e));
                        }
                        document.removeEventListener("click", playOnClick);
                    };
                    document.addEventListener("click", playOnClick, { once: true });
                });

            return true;
        } catch (e) {
            console.error("[CustomRingTone] Error in playAudio:", e);
            return false;
        }
    },

    async start() {
        try {
            const url = parseUrl(settings.store.customURL);
            if (!url) {
                console.error("[CustomRingTone] Invalid URL:", settings.store.customURL);
                return;
            }

            await this.loadAudio(url);
        } catch (e) {
            console.error("[CustomRingTone] Error in start:", e);
        }
    },

    stop() {
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
    },

    isRingtone(name: string) {
        return RINGTONE_NAMES.includes(name);
    },

    patches: [
        {
            find: "class{get volume(){return this._volume}set volume",
            replacement: {
                match: /ensureAudio\(\)\{([^}]*)\}/,
                replace: "ensureAudio(){if(Vencord.Plugins.plugins.CustomRingTone?.isRingtone(this.name) && Vencord.Plugins.plugins.CustomRingTone?.audio){try{Vencord.Plugins.plugins.CustomRingTone.playAudio();return Promise.resolve(Vencord.Plugins.plugins.CustomRingTone.audio);}catch(e){console.error(\"[CustomRingTone] Error in ensureAudio patch:\", e);}}$1}"
            }
        },
        {
            find: "destroyAudio(){null!=this._audio",
            replacement: {
                match: /destroyAudio\(\)\{(null!=this\._audio[^}]*)\}/,
                replace: "destroyAudio(){try{if(Vencord.Plugins.plugins.CustomRingTone?.isRingtone(this.name)){if(Vencord.Plugins.plugins.CustomRingTone?.audio){Vencord.Plugins.plugins.CustomRingTone.audio.pause();}}}catch(e){console.error(\"[CustomRingTone] Error in destroyAudio patch:\",e);}$1}"
            }
        },
        {
            find: "\"call_ringing\"",
            replacement: {
                match: /(\w+)\.play\(\s*["']call_ringing(_beat)?["']/g,
                replace: "($1.name==='call_ringing$2'&&Vencord.Plugins.plugins.CustomRingTone?.audio?Vencord.Plugins.plugins.CustomRingTone.playAudio():$1.play('call_ringing$2"
            }
        }
    ]
});
