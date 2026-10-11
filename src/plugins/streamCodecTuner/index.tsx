/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { React, useState } from "@webpack/common";

import {
    getReport,
    isCodecAvailable,
    probeHardware } from "./hwprobe";
export {
    getReport,
    isCodecAvailable,
    PROBE_TIMEOUT_MS,
    probeHardware,
    setProbeTimeoutMs
} from "./hwprobe";

const settings = definePluginSettings({
    videoCodec: {
        type: OptionType.SELECT,
        description: "Video codec to use for streaming",
        options: [
            { label: "Automatic (Discord default)", value: "AUTO", default: true },
            { label: "VP8", value: "VP8" },
            { label: "VP9", value: "VP9" },
            { label: "H264", value: "H264" },
            { label: "AV1", value: "AV1" },
            { label: "H265 (HEVC)", value: "H265" }
        ],
        // Per-option availability: gray out codecs proven unavailable on this
        // host. AUTO stays selectable; codecs whose status is null (unknown)
        // stay selectable too. Safe when invoked with no option (Vencord's
        // setting-level isSettingDisabled) — in that case we never disable.
        disabled: (option?: { label: string; value: string | number | boolean; default?: boolean; }, value?: any) =>
            option ? option.value !== "AUTO" && isCodecAvailable(option.value as string) === false : false
    },
    codecMode: {
        type: OptionType.SELECT,
        description: "PREFER: put the codec first in the offer (falls back if unsupported). FORCE: strip all other video codecs from the offer.",
        options: [
            { label: "Prefer (fallback allowed)", value: "prefer", default: true },
            { label: "Force (no fallback)", value: "force" }
        ]
    },
    enableBitrateOverrides: {
        type: OptionType.BOOLEAN,
        description: "Inject x-google-min/start/max-bitrate into the video SDP",
        label: "Override stream bitrates",
        default: true
    },
    minBitrateKbps: {
        type: OptionType.NUMBER,
        description: "Minimum bitrate (kbps). Keep low (200-500) so congestion control can still react.",
        default: 300
    },
    startBitrateKbps: {
        type: OptionType.NUMBER,
        description: "Initial/start bitrate (kbps) used at stream start before probing.",
        default: 2500
    },
    maxBitrateKbps: {
        type: OptionType.NUMBER,
        description: "Maximum bitrate (kbps) hard ceiling for the encoder.",
        default: 8000
    },
    keyframeIntervalMs: {
        type: OptionType.NUMBER,
        description: "Keyframe interval in ms for VP8/VP9/AV1 (0 = encoder default)",
        default: 0
    },
    raiseBuiltinCaps: {
        type: OptionType.BOOLEAN,
        description: "Raise Discord's built-in desktop bitrate caps and golive quality defaults to match the values above",
        label: "Raise built-in bitrate caps",
        default: true
    },
    h264HwProfileRewrite: {
        type: OptionType.BOOLEAN,
        description: "Rewrite H264 Constrained Baseline (42e0xx) to Baseline (4200xx) so hardware encoders (Media Foundation / VideoToolbox) are selected instead of OpenH264 software",
        label: "H264 hardware profile rewrite",
        default: false
    },
    debugLogging: {
        type: OptionType.BOOLEAN,
        description: "Log SDP codec/bitrate changes to the console (DevTools)",
        label: "Debug logging",
        default: false
    },
    hwInfo: {
        type: OptionType.COMPONENT,
        description: "Hardware acceleration & codec availability",
        component: HwInfoView
    }
});

// ---- Hardware acceleration UI (settings card) ----

// Small error boundary so a render throw can't crash Discord.
// React from @webpack/common is a *lazy* binding — it is only assigned
// (via waitFor) after the WebpackPatcher finds Discord's React chunk.
// So we must NOT `extends React.Component` at module-evaluation time:
// `React` is still `undefined` then, `extends undefined` throws
// "Cannot read properties of undefined (reading 'Component')" and kills
// the whole renderer before `window.Vencord` is ever set. Instead, build
// the class lazily on first render — which is guaranteed to be
// post-resolution (the settings COMPONENT only mounts at runtime).
let HwInfoBoundaryClass: (new (props: { children: React.ReactNode }) => React.Component<any, { failed: boolean }>) | null = null;
function HwInfoBoundary(props: { children: React.ReactNode }) {
    if (!HwInfoBoundaryClass) {
        class Boundary extends React.Component<{ children: React.ReactNode; }, { failed: boolean }> {
            state: { failed: boolean } = { failed: false };
            static getDerivedStateFromError() {
                return { failed: true };
            }
            componentDidCatch(e: any) {
                console.error("[StreamCodecTuner] hwInfo render failed:", e);
            }
            render() {
                if (this.state.failed) {
                    return <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.7 }}>hw-info view errored</div>;
                }
                return this.props.children;
            }
        }
        HwInfoBoundaryClass = Boundary;
    }
    const B = HwInfoBoundaryClass;
    return <B>{props.children}</B>;
}

// One-line human summary of which codecs are proven unavailable.
export function codecAvailabilityNote(): string {
    const unavailable: string[] = [];
    for (const c of ["VP8", "VP9", "H264", "AV1", "H265"]) {
        if (isCodecAvailable(c) === false) unavailable.push(c);
    }
    if (!unavailable.length) return "";
    return `${unavailable.join(", ")}: unavailable on this GPU`;
}

// The render target for the `hwInfo` COMPONENT setting. Reads the last probe,
// re-scans on demand, and force-re-renders via a useState tick.
export function HwInfoView(_props: any) {
    const [, setTick] = useState(0);
    const r = getReport();
    const rescan = () => {
        probeHardware().then(() => setTick(t => t + 1)).catch(() => setTick(t => t + 1));
    };
    const statusOf = (c: string): string => {
        const s = r.codecStatus[c];
        if (!s || s.supported === null) return "unknown";
        return s.supported ? "available" : "unavailable";
    };
    return (
        <HwInfoBoundary>
            <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ opacity: 0.8, marginBottom: 4 }}>
                    {r.probedAt ? `probed ${new Date(r.probedAt).toLocaleTimeString()}` : "not probed yet…"}
                </div>
                <div>
                    {r.backendNotes.length
                        ? r.backendNotes.map((n, i) => <div key={i}>{n}</div>)
                        : <div style={{ opacity: 0.7 }}>(no backend notes)</div>}
                </div>
                <div style={{ margin: "6px 0" }}>
                    {["VP8", "VP9", "H264", "AV1", "H265"].map(c => {
                        const s = r.codecStatus[c];
                        return (
                            <div key={c}>
                                {c}: {statusOf(c)}{s?.source && s.supported !== null ? ` (${s.source})` : ""}
                            </div>
                        );
                    })}
                </div>
                {codecAvailabilityNote() && <div style={{ opacity: 0.9 }}>{codecAvailabilityNote()}</div>}
                <button
                    onClick={rescan}
                    style={{
                        marginTop: 8,
                        padding: "4px 10px",
                        fontFamily: "inherit",
                        fontSize: 12,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.3)",
                        borderRadius: 4,
                        color: "inherit",
                        cursor: "pointer"
                    }}>
                    Rescan
                </button>
            </div>
        </HwInfoBoundary>
    );
}

// Throttled re-probe on window focus (30s).
let lastFocusProbeMs = 0;
function onFocusReprobe() {
    const now = Date.now();
    if (now - lastFocusProbeMs < 30000) return;
    lastFocusProbeMs = now;
    probeHardware().catch(() => { /* probeHardware never throws, be safe anyway */ });
}

const VIDEO_CODECS: readonly string[] = ["VP8", "VP9", "H264", "AV1", "H265"];
const AUDIO_CODEC_NAMES: readonly string[] = ["opus", "pcmu", "pcma", "telephone-event", "cn"];

function normName(name: string): string {
    const u = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (u.startsWith("H264") || u.startsWith("AVC")) return "H264";
    if (u.startsWith("H265") || u.startsWith("HEVC")) return "H265";
    return u;
}

// Late-bound reference so the RTCPeerConnection hooks can call plugin methods.
let pluginRef: { mungeSdp(sdp: string): string; } | null = null;

function hookDescription(desc: any): any {
    if (!desc?.sdp || typeof desc.sdp !== "string" || !pluginRef) return desc;
    try {
        const munged = pluginRef.mungeSdp(desc.sdp);
        if (munged === desc.sdp) return desc;
        try {
            return new RTCSessionDescription({ type: desc.type, sdp: munged });
        } catch {
            return { ...desc, sdp: munged };
        }
    } catch (e) {
        console.error("[StreamCodecTuner] SDP munge failed, passing through:", e);
        return desc;
    }
}

type HookName = "setLocalDescription" | "createOffer" | "createAnswer";
const originals = new Map<HookName, Function>();

function installSdpHooks() {
    const proto = typeof window !== "undefined" ? window.RTCPeerConnection?.prototype : undefined;
    if (!proto || originals.size) return;

    const origSLD = proto.setLocalDescription as Function;
    originals.set("setLocalDescription", origSLD);
    proto.setLocalDescription = function (this: any, ...args: any[]) {
        if (args.length > 0) args[0] = hookDescription(args[0]);
        return origSLD.apply(this, args);
    };

    for (const name of ["createOffer", "createAnswer"] as const) {
        const orig = proto[name] as Function;
        originals.set(name, orig);
        proto[name] = function (this: any, ...args: any[]) {
            return Promise.resolve(orig.apply(this, args)).then((desc: any) => hookDescription(desc) ?? desc);
        };
    }
}

function uninstallSdpHooks() {
    const proto = typeof window !== "undefined" ? window.RTCPeerConnection?.prototype : undefined;
    if (!proto) return;
    for (const [name, orig] of originals) {
        (proto as any)[name] = orig;
    }
    originals.clear();
}

export default definePlugin({
    name: "StreamCodecTuner",
    description: "Force a video codec (VP8/VP9/H264/AV1/H265) and custom min/start/max bitrates for screen streaming instead of Discord's automatic selection.",
    authors: [Devs.mostwanted002],
    tags: ["Voice", "Utility", "Streaming"],
    settings,

    start() {
        pluginRef = this as any;
        installSdpHooks();
        // Fire-and-forget: probe hardware acceleration / codec availability.
        // Store the result in the module-level report (see hwprobe.ts).
        probeHardware().then(() => { /* report is updated inside */ }).catch(() => { /* never throws */ });
        if (typeof window !== "undefined") {
            window.addEventListener("focus", onFocusReprobe);
        }
    },
    stop() {
        uninstallSdpHooks();
        pluginRef = null;
        if (typeof window !== "undefined") {
            window.removeEventListener("focus", onFocusReprobe);
        }
    },

    patches: [
        {
            // MediaEngine codec table: same hook point as Equicord StreamingCodecDisabler.
            // Reorders / disables codecs before Discord negotiates encoders.
            find: "lastOverrideCodecDenylist.length",
            replacement: {
                match: /(let \i=)(\i\(\i\))(?=,\i=this\.lastOverrideCodecDenylist\.length)/,
                replace: "$1$self.filterCodecs($2)"
            },
            noWarn: true
        },
        {
            // Golive quality defaults (bitrateMin/Max/Target, capture/encode opts)
            find: "this.getDefaultGoliveQuality()",
            replacement: {
                match: /this\.getDefaultGoliveQuality\(\)/,
                replace: "$self.patchGoliveQuality($&)"
            }
        },
        {
            // Built-in desktop bitrate constants {min,max,target} in bits/s
            find: "desktopBitrate:{",
            replacement: {
                match: /desktopBitrate:\{min:\i,max:\i,target:\i\}/,
                replace: "$self.getDesktopBitrate()"
            },
            noWarn: true
        }
    ],

    // ---- Layer 1: MediaEngine codec table ----
    filterCodecs(codecs: any[]) {
        const sel = settings.store.videoCodec;
        const mode = settings.store.codecMode;
        if (sel === "AUTO" || !Array.isArray(codecs)) return codecs;

        const isSel = (c: any) => normName(String(c?.name ?? "")) === sel;

        if (mode === "force") {
            // Only the selected codec may encode; everything else off.
            return codecs.map(c => isSel(c) ? { ...c, encode: true } : { ...c, encode: false });
        }
        // prefer: selected codec first, others still available
        return [...codecs.filter(isSel), ...codecs.filter(c => !isSel(c))];
    },

    // ---- Layer 3: quality/bitrate constants ----
    patchGoliveQuality(opts: any) {
        if (!settings.store.raiseBuiltinCaps || !opts) return opts;
        opts.bitrateMin = settings.store.minBitrateKbps * 1000;
        opts.bitrateTarget = settings.store.startBitrateKbps * 1000;
        opts.bitrateMax = settings.store.maxBitrateKbps * 1000;
        return opts;
    },

    getDesktopBitrate() {
        if (!settings.store.raiseBuiltinCaps) return { min: 5e5, max: 35e5, target: 6e5 };
        return {
            min: settings.store.minBitrateKbps * 1000,
            max: settings.store.maxBitrateKbps * 1000,
            target: settings.store.startBitrateKbps * 1000
        };
    },

    // ---- Layer 2: SDP munging ----
    mungeSdp(sdp: string): string {
        const sel = settings.store.videoCodec as string;
        const mode = settings.store.codecMode;
        const doBitrate = settings.store.enableBitrateOverrides;
        const doHw = settings.store.h264HwProfileRewrite;
        if (sel === "AUTO" && !doBitrate && !doHw) return sdp;

        // Split keeping line terminators so we can rejoin losslessly.
        const parts = sdp.split(/(\r\n|\n)/);
        // parts alternates: line, sep, line, sep, ...
        const lines: string[] = [];
        const seps: string[] = [];
        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) lines.push(parts[i]);
            else seps.push(parts[i]);
        }

        // Pass 1: payload type -> codec name from rtpmap lines
        const ptCodec = new Map<string, string>();
        for (const l of lines) {
            const m = /^a=rtpmap:(\d+)\s+([^\s/]+)/i.exec(l);
            if (m) ptCodec.set(m[1], m[2]);
        }

        // Base pt -> auxiliary pts (rtx/fec via apt=). apt= can appear
        // anywhere in the fmtp attrs, not just at the start.
        const auxPts = new Map<string, string[]>();
        for (const l of lines) {
            const m = /^a=fmtp:(\d+)\b/.exec(l);
            const apt = m ? /(?:^|[;\s])apt=(\d+)/i.exec(l) : null;
            if (m && apt) {
                if (!auxPts.has(apt[1])) auxPts.set(apt[1], []);
                auxPts.get(apt[1])!.push(m[1]);
            }
        }

        const classify = (pt: string): string => {
            const codec = ptCodec.get(pt);
            if (!codec) return "unknown";
            if (AUDIO_CODEC_NAMES.includes(codec.toLowerCase())) return "audio";
            const n = normName(codec);
            return (VIDEO_CODECS as readonly string[]).includes(n) ? n : "other-video";
        };

        let changed = false;
        const out = lines.slice();
        let inVideoMedia = false;

        for (let i = 0; i < out.length; i++) {
            const line = out[i];

            const mediaM = /^m=(\S+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line);
            if (mediaM) {
                inVideoMedia = mediaM[1].toLowerCase() === "video";
                if (inVideoMedia && sel !== "AUTO") {
                    const fmts = mediaM[4].split(/\s+/).filter(Boolean);
                    const keep: string[] = [];
                    const seen = new Set<string>();
                    const pushPt = (pt: string) => {
                        if (seen.has(pt)) return;
                        seen.add(pt);
                        keep.push(pt);
                        for (const a of auxPts.get(pt) ?? []) {
                            if (!seen.has(a)) { seen.add(a); keep.push(a); }
                        }
                    };
                    if (mode === "force") {
                        for (const pt of fmts) if (classify(pt) === sel) pushPt(pt);
                        // keep codec-agnostic fallbacks (ulpfec/red/flexfec) referenced by apt
                        for (const pt of fmts) if (classify(pt) === "other-video" && auxPts.has(pt)) pushPt(pt);
                    } else {
                        for (const pt of fmts) if (classify(pt) === sel) pushPt(pt);
                        for (const pt of fmts) if (classify(pt) !== sel) pushPt(pt);
                    }
                    if (keep.length && keep.join(" ") !== fmts.join(" ")) {
                        out[i] = `m=video ${mediaM[2]} ${mediaM[3]} ${keep.join(" ")}`;
                        changed = true;
                        continue;
                    }
                }
                continue;
            }

            if (!inVideoMedia) continue;

            const fmtpM = /^a=fmtp:(\d+)\s+(.*)$/i.exec(line);
            if (!fmtpM) continue;
            const pt = fmtpM[1];
            let attrs = fmtpM[2];
            const kind = classify(pt);
            if (kind === "audio" || kind === "unknown") continue;
            const before = attrs;

            // Bitrate caps only make sense on real video codec lines, not rtx/fec aux
            if (doBitrate && VIDEO_CODECS.includes(kind) && (sel === "AUTO" || kind === sel)) {
                attrs = attrs.replace(/;?\bx-google-(?:min|max|start)-bitrate=\d+/gi, "").replace(/^;/, "");
                attrs += `;x-google-min-bitrate=${settings.store.minBitrateKbps}`
                    + `;x-google-start-bitrate=${settings.store.startBitrateKbps}`
                    + `;x-google-max-bitrate=${settings.store.maxBitrateKbps}`;
            }

            const kf = settings.store.keyframeIntervalMs;
            if (kf > 0 && (kind === "VP8" || kind === "VP9" || kind === "AV1")) {
                attrs = attrs.replace(/;?\bx-google-keyframe-interval=\d+/gi, "").replace(/^;/, "");
                attrs += `;x-google-keyframe-interval=${kf}`;
            }

            if (doHw && kind === "H264") {
                attrs = attrs.replace(/profile-level-id=42e0([0-9a-fA-F]{2})/gi, "profile-level-id=4200$1");
            }

            if (attrs !== before) {
                out[i] = `a=fmtp:${pt} ${attrs}`;
                changed = true;
            }
        }

        if (!changed) return sdp;
        if (settings.store.debugLogging) {
            console.log(`[StreamCodecTuner] SDP munged (codec=${sel}, mode=${mode})`);
        }
        let result = "";
        for (let i = 0; i < out.length; i++) {
            result += out[i] + (seps[i] ?? "");
        }
        return result;
    }
});
