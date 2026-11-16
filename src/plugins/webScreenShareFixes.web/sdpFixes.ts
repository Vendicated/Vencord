/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { MediaEngineConnection } from "@vencord/discord-types";

export interface SdpRtp {
    payload: number;
    codec: string;
}

export interface SdpFmtp {
    payload: number;
    config: string;
}

export const MAX_H264_PROFILE_IDC = 100;

export function getH264Profile(config = "") {
    return config.match(/profile-level-id=([0-9a-f]{4})/i)?.[1].toLowerCase();
}

export function addFmtpParameters(sdp: string, codecPattern: RegExp, parameters: Record<string, string>) {
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

export function getStreamAudioBitrate(conn: MediaEngineConnection, bitrate: number) {
    return conn.context === "stream" ? Math.max(128000, bitrate) : bitrate;
}

export function findPreferredCodec(rtp: SdpRtp[], fmtp: SdpFmtp[], codec: string, profiles: string[]) {
    const fallback = rtp.find(entry => entry.codec === codec);
    if (codec !== "H264") return fallback;

    for (const profile of profiles) {
        const match = rtp.find(entry => {
            const config = fmtp.find(f => f.payload === entry.payload)?.config;
            return entry.codec === "H264" && getH264Profile(config) === profile && config?.includes("packetization-mode=1");
        });
        if (match) return match;
    }
    return fallback;
}

export function fixAnswer(
    conn: MediaEngineConnection,
    peerConnection: RTCPeerConnection,
    answer: RTCSessionDescription,
    SessionDescription: typeof RTCSessionDescription = RTCSessionDescription
) {
    const offerSdp = peerConnection.localDescription?.sdp ?? "";
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
        sdp = addFmtpParameters(sdp, /^(H264|H265|VP8|VP9|AV1)$/i, { "x-google-start-bitrate": "2500" });
    }
    return new SessionDescription({ type: answer.type, sdp });
}
