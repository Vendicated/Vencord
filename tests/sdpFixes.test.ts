/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@tests/setup";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    addFmtpParameters,
    findPreferredCodec,
    fixAnswer,
    getH264Profile,
    getStreamAudioBitrate
} from "@plugins/webScreenShareFixes.web/sdpFixes";

function FakeDescription(this: any, init: any) {
    this.type = init.type;
    this.sdp = init.sdp;
}

describe("sdpFixes", () => {
    it("reads the profile part of profile-level-id", () => {
        assert.equal(getH264Profile("profile-level-id=640033;packetization-mode=1"), "6400");
    });

    it("adds fmtp parameters only for the matching codec", () => {
        const sdp = [
            "a=rtpmap:111 opus/48000/2",
            "a=fmtp:111 minptime=10",
            "a=rtpmap:102 H264/90000",
            "a=fmtp:102 packetization-mode=1"
        ].join("\r\n");

        const result = addFmtpParameters(sdp, /^opus$/i, { stereo: "1" });

        assert.ok(result.includes("a=fmtp:111 minptime=10;stereo=1"));
        assert.ok(!result.includes("a=fmtp:102 packetization-mode=1;stereo=1"));
    });

    it("raises only the stream audio bitrate", () => {
        assert.equal(getStreamAudioBitrate({ context: "stream" } as any, 64000), 128000);
        assert.equal(getStreamAudioBitrate({ context: "voice" } as any, 64000), 64000);
    });

    it("prefers a hardware H264 profile", () => {
        const rtp = [
            { payload: 102, codec: "H264" },
            { payload: 103, codec: "H264" }
        ];
        const fmtp = [
            { payload: 102, config: "profile-level-id=42e01f;packetization-mode=1" },
            { payload: 103, config: "profile-level-id=640033;packetization-mode=1" }
        ];

        assert.equal(findPreferredCodec(rtp, fmtp, "H264", ["6400"])?.payload, 103);
    });

    it("uses the offered H264 profile in the answer", () => {
        const offerSdp = [
            "v=0",
            "o=- 123456789 2 IN IP4 127.0.0.1",
            "s=-",
            "t=0 0",
            "m=video 9 UDP/TLS/RTP/SAVPF 102",
            "a=rtpmap:102 H264/90000",
            "a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640033"
        ].join("\r\n");
        const answerSdp = [
            "v=0",
            "o=- 987654321 2 IN IP4 127.0.0.1",
            "s=-",
            "t=0 0",
            "m=video 9 UDP/TLS/RTP/SAVPF 102",
            "a=rtpmap:102 H264/90000",
            "a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f"
        ].join("\r\n");

        const result = fixAnswer(
            { context: "voice" } as any,
            { localDescription: { sdp: offerSdp } } as any,
            { type: "answer", sdp: answerSdp } as any,
            FakeDescription as any
        );

        assert.ok(result.sdp.includes("profile-level-id=640033"));
    });
});
