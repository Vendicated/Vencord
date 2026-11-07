/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { MediaEngineConnection } from "@vencord/discord-types";

const logger = new Logger("WebScreenShareFixes");

function addFmtpParameters(sdp: string, codecPattern: RegExp, parameters: Record<string, string>) {
    const lines = sdp.split(/\r?\n/);
    const payloads = new Set(lines.flatMap(line => {
        const rtpmap = line.match(/^a=rtpmap:(\d+) ([^/]+)\//);
        return rtpmap && codecPattern.test(rtpmap[2]) ? rtpmap[1] : [];
    }));

    return lines.map(line => {
        const fmtp = line.match(/^a=fmtp:(\d+) (.*)$/);
        if (!fmtp || !payloads.has(fmtp[1])) return line;

        const config = fmtp[2].split(";").filter(Boolean);
        const keys = new Set(config.map(entry => entry.split("=")[0]));
        for (const [key, value] of Object.entries(parameters)) {
            if (!keys.has(key)) config.push(`${key}=${value}`);
        }
        return `a=fmtp:${fmtp[1]} ${config.join(";")}`;
    }).join("\r\n");
}

interface SdpRtp {
    payload: number;
    codec: string;
}

interface SdpFmtp {
    payload: number;
    config: string;
}

// High (profile_idc 100) is the highest 8 bit 4:2:0 profile
const MAX_H264_PROFILE_IDC = 100;

// Profile part (profile_idc and constraint flags) of the profile-level-id, without the level
function getH264Profile(config = "") {
    return config.match(/profile-level-id=([0-9a-f]{4})/i)?.[1].toLowerCase();
}

// H264 profiles that encode in hardware on this device, ordered from the highest profile_idc
let hardwareH264Profiles: string[] = [];

export default definePlugin({
    name: "WebScreenShareFixes",
    authors: [Devs.Kaitlyn, Devs.ThaUnknown],
    description: "Removes 2500kbps bitrate cap on chromium and vesktop clients, enables stereo stream audio with a higher bitrate, raises the start bitrate of streams, uses hardware H264 encoding and fixes CPU usage growing endlessly while screensharing.",
    tags: ["Voice"],
    enabledByDefault: true,

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

            hardwareH264Profiles = [...hardwareProfilesSet].sort((a, b) => parseInt(b.slice(0, 2), 16) - parseInt(a.slice(0, 2), 16));
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
            find: "ApplicationStreamPreviewUploadManager",
            replacement: {
                match: /removeAttribute\("srcObject"\)(?<=(\i)\..+?)/,
                replace: "pause(),$1.srcObject=null"
            }
        }
    ],

    // Discord sends stream audio at the voice bitrate usually 64kbps
    getStreamAudioBitrate(conn: MediaEngineConnection, bitrate: number) {
        return conn.context === "stream" ? Math.max(128000, bitrate) : bitrate;
    },

    findPreferredCodec(rtp: SdpRtp[], fmtp: SdpFmtp[], codec: string) {
        const fallback = rtp.find(entry => entry.codec === codec);
        if (codec !== "H264") return fallback;

        for (const profile of hardwareH264Profiles) {
            const match = rtp.find(entry => {
                const config = fmtp.find(f => f.payload === entry.payload)?.config;
                return entry.codec === "H264" && getH264Profile(config) === profile && config?.includes("packetization-mode=1");
            });
            if (match) return match;
        }
        return fallback;
    },

    fixAnswer(conn: MediaEngineConnection, peerConnection: RTCPeerConnection, answer: RTCSessionDescription) {
        const offerSdp = peerConnection.localDescription?.sdp ?? "";
        // Discord always answers with H264 Constrained Baseline, the browser encodes with the profile of the answer,
        // so use the profile that the browser offered for the payload
        const offerProfiles = new Map<string, string>();
        for (const match of offerSdp.matchAll(/^a=fmtp:(\d+) .*profile-level-id=([0-9a-f]{6})/gim)) {
            offerProfiles.set(match[1], match[2]);
        }

        let sdp = answer.sdp.replace(/^(a=fmtp:(\d+) .*profile-level-id=)[0-9a-f]{6}/gim, (line, prefix: string, payload: string) => {
            const offerProfile = offerProfiles.get(payload);
            return offerProfile ? prefix + offerProfile : line;
        });
        if (conn.context === "stream") {
            sdp = addFmtpParameters(sdp, /^opus$/i, { "stereo": "1", "sprop-stereo": "1" });
            // In kbps. Without this, the browser starts at 300kbps and the first seconds of a stream are blurry
            sdp = addFmtpParameters(sdp, /^(H264|H265|VP8|VP9|AV1)$/i, { "x-google-start-bitrate": "2500" });
        }
        return new RTCSessionDescription({ type: answer.type, sdp });
    }
});
