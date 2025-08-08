/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MediaEngineStore } from "@webpack/common";

let mediaEngine = MediaEngineStore;

const originalCodecStatuses: {
    AV1: boolean,
    H265: boolean,
    H264: boolean;
} = {
    AV1: true,
    H265: true,
    H264: true
};

const settings = definePluginSettings({
    disableAv1Codec: {
        description: "Make Discord not consider using AV1 for streaming.",
        type: OptionType.BOOLEAN,
        default: false
    },
    disableH265Codec: {
        description: "Make Discord not consider using H265 for streaming.",
        type: OptionType.BOOLEAN,
        default: false
    },
    disableH264Codec: {
        description: "Make Discord not consider using H264 for streaming.",
        type: OptionType.BOOLEAN,
        default: false
    },
});

export default definePlugin({
    name: "StreamingCodecDisabler",
    description: "Disable codecs for streaming of your choice",
    authors: [EquicordDevs.davidkra230],
    settings,

    patches: [
        {
            find: "setVideoBroadcast(this.shouldConnectionBroadcastVideo",
            replacement: {
                match: /setGoLiveSource\(.,.\)\{/,
                replace: "$&$self.updateDisabledCodecs();"
            },
        }
    ],

    async updateDisabledCodecs() {
        mediaEngine.setAv1Enabled(originalCodecStatuses.AV1 && !Settings.plugins.StreamingCodecDisabler.disableAv1Codec);
        mediaEngine.setH265Enabled(originalCodecStatuses.H265 && !Settings.plugins.StreamingCodecDisabler.disableH265Codec);
        mediaEngine.setH264Enabled(originalCodecStatuses.H264 && !Settings.plugins.StreamingCodecDisabler.disableH264Codec);
    },

    async start() {
        mediaEngine = mediaEngine.getMediaEngine();
        const options = Object.keys(originalCodecStatuses);
        // [{"codec":"","decode":false,"encode":false}]
        const CodecCapabilities = JSON.parse(await new Promise(res => mediaEngine.getCodecCapabilities(res)));
        CodecCapabilities.forEach((codec: { codec: string; encode: boolean; }) => {
            if (options.includes(codec.codec)) {
                originalCodecStatuses[codec.codec] = codec.encode;
            }
        });
    },

    async stop() {
        mediaEngine.setAv1Enabled(originalCodecStatuses.AV1);
        mediaEngine.setH265Enabled(originalCodecStatuses.H265);
        mediaEngine.setH264Enabled(originalCodecStatuses.H264);
    }
});
