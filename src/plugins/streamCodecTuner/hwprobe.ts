/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface CodecHwStatus {
    /** null = unknown / probe failed */
    supported: boolean | null;
    /** Which backend produced this status. */
    source: string;
}

export interface HwReport {
    adapters: { description: string; kind: string; }[];
    codecStatus: Record<string, CodecHwStatus>;
    probedAt: number;
    backendNotes: string[];
}

/**
 * Per-probe timeout in ms. Exported (and mutable) so tests can shrink it to
 * exercise the timeout path quickly.
 */
export let PROBE_TIMEOUT_MS = 5000;

/** Shrink/restore the per-probe timeout (used by tests). */
export function setProbeTimeoutMs(ms: number) {
    PROBE_TIMEOUT_MS = ms;
}

const CODECS = ["VP8", "VP9", "H264", "AV1", "H265"] as const;

// Codec strings for WebCodecs VideoEncoder.isConfigSupported.
const WC_CODEC_STRINGS: Record<string, string> = {
    VP8: "vp8",
    VP9: "vp9",
    H264: "avc1.4d0034",
    AV1: "av01.0.08m.08",
    H265: "hev1.1.6.L153.90"
};
// Container mime for mediaCapabilities.encodingInfo fallback.
const MC_MIME: Record<string, string> = {
    VP8: "video/webm", VP9: "video/webm", AV1: "video/webm",
    H264: "video/mp4", H265: "video/mp4"
};

const TIMEOUT = Symbol("probe-timeout");

/**
 * Race a promise against a timeout. Always resolves (never rejects):
 *  - the value on success,
 *  - TIMEOUT on timeout OR on rejection (both mean "probe failed" -> null).
 * The timer is cleared so it can't linger.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | typeof TIMEOUT> {
    return new Promise<T | typeof TIMEOUT>(resolve => {
        const done = (v: T | typeof TIMEOUT) => {
            clearTimeout(timer);
            resolve(v);
        };
        const timer = setTimeout(() => done(TIMEOUT), ms);
        (p as Promise<T>).then(
            v => done(v),
            () => done(TIMEOUT)
        );
    });
}

/** Normalize an SDP rtpmap codec name to one of CODECS (or the raw upper name). */
function normName(name: string): string {
    const u = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (u.startsWith("H264") || u.startsWith("AVC")) return "H264";
    if (u.startsWith("H265") || u.startsWith("HEVC")) return "H265";
    return u;
}

const CODEC_SET: Set<string> = new Set<string>(CODECS as readonly string[]);

// Module-level report state. Starts empty / unprobed (probedAt = 0).
export let report: HwReport = {
    adapters: [],
    codecStatus: {},
    probedAt: 0,
    backendNotes: []
};

export function getReport(): HwReport {
    return report;
}

/**
 * Availability of a codec from the last probe.
 *  - true  => a backend confirmed it,
 *  - false => all backends that COMPLETED reported it absent,
 *  - null  => unknown (no backend reported, or none probed yet).
 */
export function isCodecAvailable(codec: string): boolean | null {
    const s = report.codecStatus[codec];
    return s ? s.supported : null;
}

// ---- (a) WebGPU ----
async function probeWebGPU(): Promise<{
    adapters: { description: string; kind: string; }[];
    notes: string[];
}> {
    const adapters: { description: string; kind: string; }[] = [];
    const notes: string[] = [];
    const nav = (globalThis as any)?.navigator;
    const gpu = nav?.gpu;
    if (!gpu || typeof gpu.requestAdapter !== "function") {
        notes.push("WebGPU unavailable (software encoding fallback for WebGPU codecs)");
        return { adapters, notes };
    }
    const adapter: any = await withTimeout<any>(gpu.requestAdapter(), PROBE_TIMEOUT_MS);
    if (adapter === TIMEOUT || !adapter) {
        notes.push("WebGPU unavailable (software encoding fallback for WebGPU codecs)");
        return { adapters, notes };
    }
    let description = "unknown";
    let kind = "unknown";
    // Chromium desktop: adapter.describe()
    try {
        if (typeof adapter.describe === "function") {
            const d: any = await withTimeout<any>(adapter.describe(), PROBE_TIMEOUT_MS);
            if (d && d !== TIMEOUT) {
                description = d.description ?? description;
                kind = d.kind ?? d.architecture ?? kind;
            }
        }
    } catch { /* fall through to info */ }
    // Fallback: adapter.info.*
    if (description === "unknown" && adapter.info && typeof adapter.info === "object") {
        description = adapter.info.description ?? "unknown";
        kind = adapter.info.device?.gpuArch ?? kind;
    }
    adapters.push({ description, kind });
    const k = String(kind).toLowerCase();
    if (k.includes("integrated")) notes.push("WebGPU: integrated GPU");
    else if (k.includes("discrete") || /nvidia|amd|radeon|geforce|rtx|gtx|apple/i.test(description)) notes.push("WebGPU: discrete GPU");
    else notes.push(`WebGPU: ${kind}`);
    return { adapters, notes };
}

// ---- (b) WebCodecs ----
async function probeWebCodecs(): Promise<Partial<Record<string, CodecHwStatus>>> {
    const out: Partial<Record<string, CodecHwStatus>> = {};
    const nav = (globalThis as any)?.navigator;
    const mcap = nav?.mediaCapabilities;
    const hasMcap = !!(mcap && typeof mcap.encodingInfo === "function");
    const hasVE = "VideoEncoder" in (globalThis as any) &&
        typeof (globalThis as any).VideoEncoder?.isConfigSupported === "function";
    if (!hasMcap && !hasVE) return out; // no WebCodecs at all -> all null

    // Probe all codecs in parallel; each codec still carries its own per-codec
    // timeout, so a hung API can't serialize the whole probe.
    const perCodec = async (codec: string): Promise<{ supported: boolean | null; source: string }> => {
        let supported: boolean | null = null;
        // mediaCapabilities.encodingInfo first
        if (hasMcap) {
            try {
                const info: any = await withTimeout<any>(
                    mcap.encodingInfo({
                        type: MC_MIME[codec],
                        mimeType: MC_MIME[codec],
                        video: {
                            codec: WC_CODEC_STRINGS[codec],
                            width: 1920, height: 1080,
                            bitrate: 8e6, framerate: 60
                        }
                    }), PROBE_TIMEOUT_MS);
                if (info && info !== TIMEOUT) supported = !!info.supported;
            } catch { /* supported stays null */ }
        }
        // VideoEncoder.isConfigSupported fallback
        if (supported === null && hasVE) {
            try {
                const r: any = await withTimeout<any>(
                    (globalThis as any).VideoEncoder.isConfigSupported({
                        codec: WC_CODEC_STRINGS[codec],
                        width: 1920, height: 1080,
                        bitrate: 8e6, framerate: 60
                    }), PROBE_TIMEOUT_MS);
                if (r && r !== TIMEOUT) supported = !!r.supported;
            } catch { /* supported stays null */ }
        }
        return { supported, source: "WebCodecs" };
    };
    const results = await Promise.all(CODECS.map(codec => perCodec(codec)));
    results.forEach((s, i) => {
        out[CODECS[i]] = s;
    });
    return out;
}

// ---- (c) Native / RTC ----
async function probeRTC(): Promise<{ found: Set<string>; completed: boolean; note: string | null }> {
    const found = new Set<string>();
    const RPC = (globalThis as any)?.RTCPeerConnection;
    if (typeof RPC !== "function") {
        return { found, completed: false, note: "RTCPeerConnection unavailable" };
    }
    let pc: any = null;
    try {
        pc = new RPC();
        const offer: any = await withTimeout<any>(pc.createOffer(), PROBE_TIMEOUT_MS);
        if (offer && offer !== TIMEOUT && typeof offer.sdp === "string") {
            const re = /a=rtpmap:\d+\s+([A-Za-z0-9-]+)\//gi;
            let m: RegExpExecArray | null;
            while ((m = re.exec(offer.sdp)) !== null) {
                const n = normName(m[1]);
                if (CODEC_SET.has(n)) found.add(n);
            }
            return { found, completed: true, note: null };
        }
        return { found, completed: false, note: "RTC offer timed out" };
    } catch {
        return { found, completed: false, note: "RTC probe failed" };
    } finally {
        try { pc?.close(); } catch { /* ignore */ }
    }
}

/**
 * Union across backends per the spec:
 *  - true  if ANY probe found it,
 *  - false only if all probes that COMPLETED (non-null) found it absent,
 *  - null  if all null.
 */
function unionCodecStatus(probes: Partial<Record<string, CodecHwStatus>>[]): Record<string, CodecHwStatus> {
    const out: Record<string, CodecHwStatus> = {};
    for (const codec of CODECS) {
        let anyTrue = false;
        let anyCompleted = false;
        let source = "unknown";
        for (const p of probes) {
            const s = (p as Record<string, CodecHwStatus>)[codec];
            if (!s || s.supported === null) continue;
            anyCompleted = true;
            if (s.supported === true && !anyTrue) {
                anyTrue = true;
                source = s.source; // the backend that confirmed support
            } else if (s.supported === false && source === "unknown") {
                source = s.source; // first backend that saw it absent
            }
        }
        let supported: boolean | null;
        if (anyTrue) supported = true;
        else if (anyCompleted) supported = false;
        else supported = null;
        out[codec] = { supported, source };
    }
    return out;
}

/**
 * Run all probes. Never throws. Stores the result in the module-level report.
 */
export async function probeHardware(): Promise<HwReport> {
    const adapters: { description: string; kind: string; }[] = [];
    const backendNotes: string[] = [];
    const probes: Partial<Record<string, CodecHwStatus>>[] = [];

    // (a) WebGPU
    try {
        const g = await probeWebGPU();
        adapters.push(...g.adapters);
        backendNotes.push(...g.notes);
    } catch {
        backendNotes.push("WebGPU unavailable (software encoding fallback for WebGPU codecs)");
    }

    // (b) WebCodecs
    try {
        const wc = await probeWebCodecs();
        if (Object.keys(wc).length) {
            probes.push(wc);
            if (Object.values(wc).some(s => s && s.supported !== null)) backendNotes.push("WebCodecs available");
        }
    } catch { /* leave probes as-is */ }

    // (c) RTC
    try {
        const rtc = await probeRTC();
        if (rtc.note) backendNotes.push(rtc.note);
        if (rtc.completed) {
            const rtcProbe: Partial<Record<string, CodecHwStatus>> = {};
            for (const c of CODECS) {
                rtcProbe[c] = rtc.found.has(c)
                    ? { supported: true, source: "RTC offer" }
                    : { supported: false, source: "RTC offer" };
            }
            probes.push(rtcProbe);
            if (rtc.found.has("H264")) backendNotes.push("Native H264 via hardware path (see H264 HW profile rewrite setting)");
        }
    } catch {
        backendNotes.push("RTCPeerConnection unavailable");
    }

    const codecStatus = unionCodecStatus(probes);
    const r: HwReport = { adapters, codecStatus, probedAt: Date.now(), backendNotes };
    report = r;
    return r;
}
