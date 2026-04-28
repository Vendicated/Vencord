/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "FakeSoundboard",
    description: "Allows you to use soundboard without nitro!",
    authors: [
        Devs.ImLvna,
        {
            name: "DrTankHead",
            id: 1343271462408290364n
        }
    ],

    patches: [
        // Force canUseSoundboardEverywhere and canUseCustomCallSounds to return true
        {
            find: "getDaysSincePremium",
            replacement: [{
                match: /(?<=canUseSoundboardEverywhere:)\i/,
                replace: "()=>true"
            }, {
                match: /(?<=canUseCustomCallSounds:)\i/,
                replace: "()=>true"
            }]
        },
        // Remove premium disabled state and unlock context menu
        {
            find: "?.volume)??100",
            replacement: [{
                match: /(?<=disabled:)\i&&!\i/,
                replace: "false"
            }, {
                match: /(?<=onContextMenu:)\i&&!\i\?(\i):void 0/,
                replace: "$1"
            }]
        },
        // Also play through mic stream (server call is kept)
        {
            find: "isPreviewingSound",
            replacement: {
                match: /\(0,\i\.\i\)\((\i),\i,\i\)/,
                replace: "($&,$self.playSound(`https://cdn.discordapp.com/soundboard-sounds/${$1.soundId}`))"
            }
        },
        // Hook into getUserMedia for audio pipeline
        {
            find: "onended=function(){}",
            replacement: {
                match: /(?<=acquire\((\i)\)\{return )navigator\.mediaDevices\.getUserMedia\(\1\)(?=\})/,
                replace: "$&.then(stream => $self.connectSoundboard(stream, $1.audio))"
            },
        },
        // Chain after RNNoise if noise suppression is active
        {
            find: "onended=function(){}",
            replacement: {
                match: /(?<=connectRnnoise\(stream, (\i)\.audio\)\))(?=\})/,
                replace: ".then(stream => $self.connectSoundboard(stream, $1.audio))"
            },
        }
    ],

    audioDestination: null as null | MediaStreamAudioDestinationNode,
    audioCtx: null as null | AudioContext,

    async playSound(url: string) {
        if (!this.audioCtx || !this.audioDestination) return;
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const audioBuffer = await this.audioCtx.decodeAudioData(buffer);
        const source = this.audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioDestination!);
        source.start(0, 0, 20); // 20 seconds max
    },
    async connectSoundboard(stream: MediaStream, isAudio: boolean): Promise<MediaStream> {
        if (!isAudio) return stream;
        console.log("connectSoundboard", stream);

        this.audioCtx = new AudioContext();

        const source = this.audioCtx.createMediaStreamSource(stream);

        this.audioDestination = this.audioCtx.createMediaStreamDestination();
        source.connect(this.audioDestination);

        const _audioCtx = this.audioCtx;

        // Cleanup
        const onEnded = () => {
            source.disconnect();
            _audioCtx.close();
        };
        stream.addEventListener("inactive", onEnded, { once: true });

        return this.audioDestination.stream;
    },
});