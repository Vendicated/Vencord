/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { findPreferredCodec, fixAnswer, getH264Profile, getStreamAudioBitrate, MAX_H264_PROFILE_IDC, type SdpFmtp, type SdpRtp } from "@plugins/webScreenShareFixes.web/sdpFixes";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

const logger = new Logger("WebScreenShareFixes");

const settings = definePluginSettings({
    betterCodecs: {
        type: OptionType.BOOLEAN,
        description: "MAY CAUSE ISSUES! Prefer better codecs like AV1 and VP9 when streaming. Should improve quality but may lead to issues like infinitely loading streams.",
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "WebScreenShareFixes",
    authors: [Devs.Kaitlyn, Devs.ThaUnknown],
    description: "Removes 2500kbps bitrate cap on chromium and vesktop clients, enables stereo stream audio with a higher bitrate, raises the start bitrate of streams, uses hardware H264 encoding and fixes CPU usage growing endlessly while screensharing.",
    tags: ["Voice"],
    enabledByDefault: true,
    settings,

    hardwareH264Profiles: [] as string[],

    async start() {
        try {
            const hardwareProfilesSet = new Set<string>();

            await Promise.all(
                (RTCRtpSender.getCapabilities?.("video")?.codecs ?? [])
                    .map(async ({ mimeType, sdpFmtpLine }) => {
                        // browsers only registers its hardware encoders for packetization mode 1
                        if (mimeType !== "video/H264" || !sdpFmtpLine?.includes("packetization-mode=1")) return;
                        const profile = getH264Profile(sdpFmtpLine);
                        if (!profile || parseInt(profile.slice(0, 2), 16) > MAX_H264_PROFILE_IDC) return;
                        const { powerEfficient } = await navigator.mediaCapabilities.encodingInfo({
                            type: "webrtc",
                            video: { contentType: `video/H264;${sdpFmtpLine}`, width: 1920, height: 1080, bitrate: 6e6, framerate: 30 }
                        });
                        if (powerEfficient) hardwareProfilesSet.add(profile);
                    })
            );

            this.hardwareH264Profiles = [...hardwareProfilesSet].sort((a, b) => parseInt(b.slice(0, 2), 16) - parseInt(a.slice(0, 2), 16));
        } catch (e) {
            logger.error("Failed to detect hardware H264 profiles", e);
        }
    },

    patches: [
        {
            find: "x-google-max-bitrate",
            replacement: [
                {
                    match: /`x-google-max-bitrate=\$\{\i\}`/,
                    replace: '"x-google-max-bitrate=80000"'
                },
                {
                    // Prefer the H264 payload that the browser can encode in hardware
                    match: /let (\i)=(\i)\.find\(\i=>\i\.codec===(\i)\);if\(null==\1\)return null;(?=let \i=(\i)\.find\(\i=>RegExp\(`\^apt=)/,
                    replace: "let $1=$self.findPreferredCodec($2,$4,$3);if(null==$1)return null;"
                },
                {
                    // Make the answer match the offered H264 profile, for streams add the stereo audio and start bitrate parameters
                    match: /(setRemoteAnswer\(\i,\i,\i,\i\)\{let (\i)=this\.pc.{0,120}?\.setRemoteDescription\()(\i)\)/,
                    replace: "$1$self.fixAnswer(this,$2,$3))"
                },
                {
                    match: /(addTransceiver\("audio",\{direction:"recvonly",sendEncodings:\[\{maxBitrate:)(.{0,60}?)\}\]/,
                    replace: "$1$self.getStreamAudioBitrate(this,$2)}]"
                },
                {
                    match: /(parameter:\i\.AUDIO_BITRATE,value:)(.{0,60}?)\}\]/,
                    replace: "$1$self.getStreamAudioBitrate(this,$2)}]"
                }
            ]
        },
        {
            find: 'case"video":(',
            predicate: () => settings.store.betterCodecs,
            replacement: {
                match: /\i\?\[(\i\.\i)\.H265,\i\.\i\.H264,\i\.\i\.VP8,\i\.\i\.VP9\]:\[\i\.\i\.H264,\i\.\i\.VP8,\i\.\i\.VP9\]/,
                replace: '["AV1",$1.VP9,$1.H264,$1.VP8]'
            }
        },
        {
            find: "ApplicationStreamPreviewUploadManager",
            replacement: {
                match: /removeAttribute\("srcObject"\)(?<=(\i)\..+?)/,
                replace: "pause(),$1.srcObject=null"
            }
        }
    ],

    findPreferredCodec(rtp: SdpRtp[], fmtp: SdpFmtp[], codec: string) {
        return findPreferredCodec(rtp, fmtp, codec, this.hardwareH264Profiles);
    },

    fixAnswer,

    getStreamAudioBitrate
});
