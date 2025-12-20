/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";

const settings = definePluginSettings({
    multiplier: {
        description: "Volume Multiplier",
        type: OptionType.SLIDER,
        markers: makeRange(1, 5, 0.5),
        default: 2,
        stickToMarkers: true,
    }
});

interface StreamData {
    audioContext: AudioContext,
    audioElement: HTMLAudioElement,
    emitter: any,
    // added by this plugin
    gainNode?: GainNode,
    id: string,
    levelNode: AudioWorkletNode,
    sinkId: string | "default",
    stream: MediaStream,
    streamSourceNode?: MediaStreamAudioSourceNode,
    videoStreamId: string,
    _mute: boolean,
    _speakingFlags: number,
    _volume: number;
}

export default definePlugin({
    name: "VolumeBooster",
    authors: [Devs.Nuckyz, Devs.sadan],
    description: "Allows you to set the user and stream volume above the default maximum",
    settings,

    patches: [
        // Change the max volume for sliders to allow for values above 200
        ...[
            "#{intl::USER_VOLUME}",
            "currentVolume:"
        ].map(find => ({
            find,
            replacement: {
                match: /(?<=maxValue:)\i\.\i\?(\d+?):(\d+?)(?=,)/,
                replace: (_, higherMaxVolume, minorMaxVolume) => `${higherMaxVolume}*$self.settings.store.multiplier`
            }
        })),
        // Patches needed for web/vesktop
        {
            find: "streamSourceNode",
            predicate: () => !IS_DISCORD_DESKTOP,
            group: true,
            replacement: [
                // Remove rounding algorithm
                {
                    match: /Math\.max.{0,30}\)\)/,
                    replace: "arguments[0]"
                },
                // Fix streams not playing audio until you update them
                {
                    match: /\}return"video"/,
                    replace: "this.updateAudioElement();$&"
                },
                // Patch the volume
                {
                    match: /\.volume=this\._volume\/100;/,
                    replace: ".volume=0.00;$self.patchVolume(this);"
                }
            ]
        },
        // Prevent Audio Context Settings sync from trying to sync with values above 200, changing them to 200 before we send to Discord
        {
            find: "AudioContextSettingsMigrated",
            replacement: [
                {
                    match: /(?<=isLocalMute\(\i,\i\),volume:(\i).+?\i\(\i,\i,)\1(?=\))/,
                    replace: "$&>200?200:$&"
                },
                {
                    match: /(?<=Object\.entries\(\i\.localMutes\).+?volume:).+?(?=,)/,
                    replace: "$&>200?200:$&"
                },
                {
                    match: /(?<=Object\.entries\(\i\.localVolumes\).+?volume:).+?(?=})/,
                    replace: "$&>200?200:$&"
                }
            ]
        },
        // Prevent the MediaEngineStore from overwriting our LocalVolumes above 200 with the ones the Discord Audio Context Settings sync sends
        {
            find: '="MediaEngineStore",',
            replacement: [
                {
                    match: /(\.settings\.audioContextSettings.+?)(\i\[\i\])=(\i\.volume)(.+?setLocalVolume\(\i,).+?\)/,
                    replace: (_, rest1, localVolume, syncVolume, rest2) => rest1
                        + `(${localVolume}>200?void 0:${localVolume}=${syncVolume})`
                        + rest2
                        + `${localVolume}??${syncVolume})`
                }
            ]
        }
    ],

    patchVolume(data: StreamData) {
        if (data.stream.getAudioTracks().length === 0) return;

        data.streamSourceNode ??= data.audioContext.createMediaStreamSource(data.stream);

        if (!data.gainNode) {
            const gain = data.gainNode = data.audioContext.createGain();
            data.streamSourceNode.connect(gain);
            gain.connect(data.audioContext.destination);
        }

        // @ts-expect-error
        if (data.sinkId != null && data.sinkId !== data.audioContext.sinkId && "setSinkId" in AudioContext.prototype) {
            // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/setSinkId
            data.audioContext.setSinkId(data.sinkId === "default" ? "" : data.sinkId);
        }

        data.gainNode.gain.value = data._mute
            ? 0
            : data._volume / 100;
    }
});
