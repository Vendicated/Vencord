/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

let orig = {};

const mungeSDP = sdp => {
    if (!sdp) return sdp;
    const opusPts = new Set();
    // find the opus codecs by PT (payload type)
    // and add them to a set to update the params later
    // this is a known issue with discord's implementation
    // on chromium based browsers (see https://support.discord.com/hc/en-us/community/posts/23128064608151-Fix-stereo-audio-for-Chromium-based-browsers-perhaps-WebRTC-SDP-issue)
    for (const line of sdp.split(/\r\n/)) {
        const m = line.match(/^a=rtpmap:(\d+)\s+opus\/48000/i);
        if (m) opusPts.add(m[1]);
    }
    if (!opusPts.size) return sdp;

    // now check each line of the SDP for the opus codecs
    // and update the params to include stereo and sprop-stereo
    return sdp.replace(/^a=fmtp:(\d+)\s+(.+)$/gmi, (full, pt, params) => {
        if (!opusPts.has(pt)) return full;
        if (/(\bstereo=1\b)|(\bsprop-stereo=1\b)/i.test(params)) return full;
        const sep = params.endsWith(";") ? "" : ";";
        return `a=fmtp:${pt} ${params}${sep}stereo=1;sprop-stereo=1`;
    });
};

const patchSDPDesc = desc => {
    if (!desc || !desc.sdp) return desc;
    return { type: desc.type, sdp: mungeSDP(desc.sdp) };
};

export default definePlugin({
    name: "StereoScreenshareAudio",
    description: "Patches Discord's WebRTC SDP to enable stereo audio while watching streams (should only be necessary with vesktop & co.)",
    authors: [Devs.Nerdwave],

    async start() {
        // grab the original setRemoteDescription and setLocalDescription functions
        orig = {
            SRD : RTCPeerConnection.prototype.setRemoteDescription,
            SLD : RTCPeerConnection.prototype.setLocalDescription,
        };

        // overwrite the setRemoteDescription and setLocalDescription functions
        // with the patched versions
        RTCPeerConnection.prototype.setRemoteDescription = function (desc, ...rest) {
            // call the original setRemoteDescription function with the patched desc
            return orig.SRD.call(this, patchSDPDesc(desc), ...rest);
        };

        RTCPeerConnection.prototype.setLocalDescription = function (desc, ...rest) {
            // setLocalDescription() may be called with no args
            // if it is defined, call the original setLocalDescription function with
            // the patched desc
            return orig.SLD.call(this, patchSDPDesc(desc), ...rest);
        };
    },

    async stop() {
        // reset the setRemoteDescription and setLocalDescription functions
        // to their original values which were stored in this.orig
        RTCPeerConnection.prototype.setRemoteDescription = orig.SRD;
        RTCPeerConnection.prototype.setLocalDescription = orig.SLD;
    },

});


