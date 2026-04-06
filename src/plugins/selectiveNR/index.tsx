/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { Menu, Toasts } from "@webpack/common";

// ─── Settings ────────────────────────────────────────────────────────────────

const settings = definePluginSettings({
    threshold: {
        type: OptionType.SLIDER,
        description: "Gate threshold (dBFS) — audio below this level is suppressed",
        markers: [-80, -60, -40, -20, 0],
        default: -40,
        stickToMarkers: false,
    },
    attack: {
        type: OptionType.SLIDER,
        description: "Attack time (ms) — how fast the gate opens when someone speaks",
        markers: [0, 5, 20, 50, 100],
        default: 5,
        stickToMarkers: false,
    },
    release: {
        type: OptionType.SLIDER,
        description: "Release time (ms) — how fast the gate closes after they stop",
        markers: [50, 120, 300, 600, 1000],
        default: 120,
        stickToMarkers: false,
    },
    hold: {
        type: OptionType.SLIDER,
        description: "Hold time (ms) — keeps gate open briefly after signal drops (prevents word clipping)",
        markers: [0, 100, 200, 400, 800],
        default: 200,
        stickToMarkers: false,
    },
    reduction: {
        type: OptionType.SLIDER,
        description: "Gain reduction when gate is closed (dBFS) — lower = more silence",
        markers: [-100, -60, -40, -20, 0],
        default: -60,
        stickToMarkers: false,
    },
});

// ─── Suppressed users ─────────────────────────────────────────────────────────

const suppressed = new Set<string>();

// ─── AudioWorklet source (inlined as blob) ────────────────────────────────────

const WORKLET_SRC = `
class NoiseGateProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "threshold", defaultValue: -40, minValue: -100, maxValue: 0, automationRate: "k-rate" },
            { name: "attack", defaultValue: 5, minValue: 0, maxValue: 500, automationRate: "k-rate" },
            { name: "release", defaultValue: 120, minValue: 0, maxValue: 2000, automationRate: "k-rate" },
            { name: "hold", defaultValue: 200, minValue: 0, maxValue: 2000, automationRate: "k-rate" },
            { name: "reduction", defaultValue: -60, minValue: -100, maxValue: 0, automationRate: "k-rate" },
        ];
    }
    constructor() {
        super();
        this._state = "closed";
        this._gain = 0;
        this._holdMs = 0;
    }
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !input.length) return true;
        const threshLin = Math.pow(10, parameters.threshold[0] / 20);
        const redLin = Math.pow(10, parameters.reduction[0] / 20);
        const attackMs = parameters.attack[0];
        const releaseMs = parameters.release[0];
        const holdMs = parameters.hold[0];
        const blockMs = (128 / sampleRate) * 1000;
        let sumSq = 0, n = 0;
        for (const ch of input) for (const s of ch) { sumSq += s * s; n++; }
        const rms = n > 0 ? Math.sqrt(sumSq / n) : 0;
        const loud = rms > threshLin;
        switch (this._state) {
            case "closed":
                if (loud) this._state = "attack";
                break;
            case "attack": {
                const step = attackMs > 0 ? blockMs / attackMs : 1;
                this._gain = Math.min(1, this._gain + step);
                if (this._gain >= 1) { this._gain = 1; this._state = "open"; }
                if (!loud) { this._state = "hold"; this._holdMs = holdMs; }
                break;
            }
            case "open":
                if (!loud) { this._state = "hold"; this._holdMs = holdMs; }
                break;
            case "hold":
                if (loud) { this._state = "open"; }
                else if ((this._holdMs -= blockMs) <= 0) this._state = "release";
                break;
            case "release": {
                const step = releaseMs > 0 ? blockMs / releaseMs : 1;
                this._gain = Math.max(redLin, this._gain - step);
                if (this._gain <= redLin) { this._gain = redLin; this._state = "closed"; }
                if (loud) this._state = "attack";
                break;
            }
        }
        for (let c = 0; c < output.length; c++) {
            const inCh = input[c] || new Float32Array(128);
            const outCh = output[c];
            for (let i = 0; i < outCh.length; i++) outCh[i] = inCh[i] * this._gain;
        }
        return true;
    }
}
registerProcessor("noise-gate-processor", NoiseGateProcessor);
`;

// ─── Audio graph ──────────────────────────────────────────────────────────────

interface UserGraph {
    source: MediaStreamAudioSourceNode;
    gate: AudioWorkletNode | null;
    gain: GainNode;
    ctx: AudioContext;
    element: HTMLAudioElement;
}

const graphs = new Map<string, UserGraph>();
let audioCtx: AudioContext | null = null;
let workletReady = false;

async function getCtx(): Promise<AudioContext> {
    if (!audioCtx || audioCtx.state === "closed") {
        audioCtx = new AudioContext();
        workletReady = false;
    }
    if (audioCtx.state === "suspended") await audioCtx.resume();
    return audioCtx;
}

async function loadWorklet(ctx: AudioContext): Promise<boolean> {
    if (workletReady) return true;
    try {
        const blob = new Blob([WORKLET_SRC], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        workletReady = true;
        return true;
    } catch (e) {
        console.error("[SelectiveNR] Worklet load failed:", e);
        return false;
    }
}

function makeGateNode(ctx: AudioContext): AudioWorkletNode {
    const node = new AudioWorkletNode(ctx, "noise-gate-processor", {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
    });
    const s = settings.store;
    node.parameters.get("threshold")!.value = s.threshold;
    node.parameters.get("attack")!.value = s.attack;
    node.parameters.get("release")!.value = s.release;
    node.parameters.get("hold")!.value = s.hold;
    node.parameters.get("reduction")!.value = s.reduction;
    return node;
}

async function hookUser(userId: string, stream: MediaStream, el: HTMLAudioElement) {
    unhookUser(userId);
    const ctx = await getCtx();
    const ok = await loadWorklet(ctx);
    const source = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();
    gain.gain.value = 1;
    let gate: AudioWorkletNode | null = null;
    if (suppressed.has(userId) && ok) {
        gate = makeGateNode(ctx);
        source.connect(gate);
        gate.connect(gain);
    } else {
        source.connect(gain);
    }
    gain.connect(ctx.destination);
    el.volume = 0;
    graphs.set(userId, { source, gate, gain, ctx, element: el });
}

function unhookUser(userId: string) {
    const g = graphs.get(userId);
    if (!g) return;
    try { g.source.disconnect(); } catch { }
    try { g.gate?.disconnect(); } catch { }
    try { g.gain.disconnect(); } catch { }
    g.element.volume = 1;
    graphs.delete(userId);
}

async function applyGate(userId: string) {
    const g = graphs.get(userId);
    if (!g || g.gate) return;
    const ok = await loadWorklet(g.ctx);
    if (!ok) return;
    try {
        g.source.disconnect();
        g.gate = makeGateNode(g.ctx);
        g.source.connect(g.gate);
        g.gate.connect(g.gain);
    } catch (e) {
        console.error("[SelectiveNR] applyGate:", e);
    }
}

function removeGate(userId: string) {
    const g = graphs.get(userId);
    if (!g || !g.gate) return;
    try {
        g.source.disconnect();
        g.gate.disconnect();
        g.source.connect(g.gain);
        g.gate = null;
    } catch (e) {
        console.error("[SelectiveNR] removeGate:", e);
    }
}

// ─── DOM observer ─────────────────────────────────────────────────────────────

let observer: MutationObserver | null = null;
let MediaEngineStore: any = null;

function userIdForStream(stream: MediaStream): string | null {
    try {
        const conns = MediaEngineStore?.getMediaEngine?.()?.connections ?? {};
        for (const conn of Object.values(conns) as any[]) {
            if (conn?.stream === stream || conn?.remoteStream === stream)
                return conn.userId ?? null;
        }
    } catch { }
    return null;
}

function watchElement(el: HTMLAudioElement) {
    if (!(el.srcObject instanceof MediaStream)) return;
    const stream = el.srcObject;
    let tries = 0;
    const poll = setInterval(() => {
        const userId = userIdForStream(stream);
        if (userId) { clearInterval(poll); hookUser(userId, stream, el); }
        else if (++tries > 20) clearInterval(poll);
    }, 100);
}

function startObserver() {
    observer = new MutationObserver(muts => {
        for (const m of muts)
            for (const node of m.addedNodes)
                if (node instanceof HTMLAudioElement) watchElement(node);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll("audio").forEach(el => watchElement(el as HTMLAudioElement));
}

// ─── Context menu ─────────────────────────────────────────────────────────────

const ctxMenuPatch: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user?.id) return;
    const isSuppressed = suppressed.has(user.id);
    children.push(
        <Menu.MenuSeparator key="snr-sep" />,
        <Menu.MenuItem
            key="snr-toggle"
            id="snr-toggle"
            label={isSuppressed ? "Unsuppress" : "Suppress"}
            action={() => {
                if (isSuppressed) {
                    suppressed.delete(user.id);
                    removeGate(user.id);
                    Toasts.show({
                        message: `${user.username} — noise gate removed`,
                        type: Toasts.Type.SUCCESS,
                        id: Toasts.genId(),
                    });
                } else {
                    suppressed.add(user.id);
                    applyGate(user.id);
                    Toasts.show({
                        message: `${user.username} — noise gate applied`,
                        type: Toasts.Type.SUCCESS,
                        id: Toasts.genId(),
                    });
                }
            }}
        />
    );
};

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "SelectiveNR",
    description: "Right-click any VC user to suppress or unsuppress their audio with a per-user noise gate.",
    authors: [{ name: "ARM9000", id: 540642909930782738n }],
    settings,

    start() {
        try {
            MediaEngineStore = findByProps("getMediaEngine", "getVideoStream");
        } catch {
            console.warn("[SelectiveNR] MediaEngineStore not found — gate may not apply until next audio event");
        }
        startObserver();
        addContextMenuPatch("user-context", ctxMenuPatch);
    },

    stop() {
        observer?.disconnect();
        observer = null;
        removeContextMenuPatch("user-context", ctxMenuPatch);
        for (const id of [...graphs.keys()]) unhookUser(id);
        audioCtx?.close();
        audioCtx = null;
        workletReady = false;
        suppressed.clear();
    },
});
