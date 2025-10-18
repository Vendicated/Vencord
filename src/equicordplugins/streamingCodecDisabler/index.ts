/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MediaEngineStore } from "@webpack/common";

interface Codecs {
    AV1: boolean;
    H265: boolean,
    H264: boolean;
    VP8: boolean;
    VP9: boolean;
}

const originalCodecStatuses: Codecs = {
    AV1: true,
    H265: true,
    H264: true,
    VP8: true,
    VP9: true,
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
    disableVP8Codec: {
        description: "Make Discord not consider using VP8 for streaming.",
        type: OptionType.BOOLEAN,
        default: false
    },
    disableVP9Codec: {
        description: "Make Discord not consider using VP9 for streaming.",
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
        const mediaEngine = MediaEngineStore.getMediaEngine();
        const options = Object.keys(originalCodecStatuses);
        const CodecCapabilities = JSON.parse(await new Promise(res => mediaEngine.getCodecCapabilities(res)));
        CodecCapabilities.forEach((codec: { codec: string; encode: boolean; }) => {
            if (options.includes(codec.codec)) {
                originalCodecStatuses[codec.codec] = codec.encode;
            }
        });

        mediaEngine.setAv1Enabled(originalCodecStatuses.AV1 && !Settings.plugins.StreamingCodecDisabler.disableAv1Codec);
        mediaEngine.setH265Enabled(originalCodecStatuses.H265 && !Settings.plugins.StreamingCodecDisabler.disableH265Codec);
        mediaEngine.setH264Enabled(originalCodecStatuses.H264 && !Settings.plugins.StreamingCodecDisabler.disableH264Codec);
    },
});
