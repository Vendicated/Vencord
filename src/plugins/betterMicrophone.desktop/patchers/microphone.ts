/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Emitter, MediaEngineStore, Patcher, types } from "../../philsPluginLibrary";
import { patchConnectionAudioTransportOptions } from "../../philsPluginLibrary/patches/audio";
import { PluginInfo } from "../constants";
import { logger } from "../logger";
import { microphoneStore } from "../stores";

// Audio processing state
let originalGetUserMedia: typeof navigator.mediaDevices.getUserMedia | null = null;
let audioContext: AudioContext | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let destinationNode: MediaStreamAudioDestinationNode | null = null;
let masterGain: GainNode | null = null;
let eqNodes: BiquadFilterNode[] = [];
let compressor: DynamicsCompressorNode | null = null;
let convolver: ConvolverNode | null = null;
let lastProcessedStream: MediaStream | null = null;
let rtcFallbackInterval: ReturnType<typeof setInterval> | null = null;
let originalRTCPeerConnectionAddTrack: ((...args: any[]) => RTCRtpSender) | null = null;

function getPeerConnectionFromAny(obj: any): RTCPeerConnection | undefined {
    try {
        if (!obj || typeof obj !== "object") return undefined;
        const candidates: any[] = [
            obj,
            obj.transport,
            obj.transport?._connection,
            obj.rtcConnection,
            obj.peerConnection,
            obj.webrtcConnection,
            obj._pc,
            obj.pc,
            obj.connection
        ];
        for (const c of candidates) {
            if (c && typeof c.getSenders === "function" && typeof c.addEventListener === "function") return c as RTCPeerConnection;
        }
        // Deep search a few levels for unusual structures
        const stack: any[] = [...candidates];
        const seen = new Set<any>();
        while (stack.length) {
            const cur = stack.pop();
            if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
            seen.add(cur);
            if (cur && typeof cur.getSenders === "function" && typeof cur.addEventListener === "function") return cur as RTCPeerConnection;
            for (const k of Object.keys(cur)) {
                try { stack.push((cur as any)[k]); } catch {}
            }
        }
    } catch {}
    return undefined;
}

function ensureAudioContext(): AudioContext {
    if (!audioContext) {
        // Force a stable, widely-supported sample rate to avoid stutters
        try {
            audioContext = new AudioContext({ sampleRate: 384000 });
        } catch {
            audioContext = new AudioContext();
        }
    }
    return audioContext;
}

function disposeAudioGraph() {
    try {
        eqNodes = [];
        compressor = null;
        convolver = null;
        if (sourceNode) {
            try { sourceNode.disconnect(); } catch {}
        }
        if (masterGain) {
            try { masterGain.disconnect(); } catch {}
        }
        if (destinationNode) {
            try { destinationNode.disconnect(); } catch {}
        }
        sourceNode = null;
        masterGain = null;
        destinationNode = null;
    } catch {}
}

function teardownAll() {
    disposeAudioGraph();
    if (audioContext) {
        try { audioContext.close(); } catch {}
        audioContext = null;
    }
}

function createImpulseResponse(ctx: AudioContext, seconds = 1.2, decay = 2.5) {
    const rate = ctx.sampleRate;
    const length = rate * seconds;
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
        const channelData = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }
    return impulse;
}

function buildGraph(stream: MediaStream, profile: any): MediaStream {
    const ctx = ensureAudioContext();
    try { void ctx.resume(); } catch {}

    disposeAudioGraph();

    sourceNode = ctx.createMediaStreamSource(stream);
    destinationNode = ctx.createMediaStreamDestination();
    masterGain = ctx.createGain();
    masterGain.gain.value = profile.masterGain || 1.0;

    // 5-band EQ
    if (profile.eqEnabled) {
        const bands = [
            { f: profile.eqLowFreq || 80, q: 1.0, gain: profile.eqLowGain || 0 },
            { f: profile.eqLowMidFreq || 500, q: 1.0, gain: profile.eqLowMidGain || 0 },
            { f: profile.eqMidFreq || 2000, q: 1.0, gain: profile.eqMidGain || 0 },
            { f: profile.eqHighMidFreq || 5000, q: 1.0, gain: profile.eqHighMidGain || 0 },
            { f: profile.eqHighFreq || 12000, q: 1.0, gain: profile.eqHighGain || 0 }
        ];
        eqNodes = bands.map(b => {
            const n = ctx.createBiquadFilter();
            n.type = "peaking";
            n.frequency.value = b.f;
            n.Q.value = b.q;
            n.gain.value = b.gain;
            return n;
        });
        try {
            logger.info("BetterMicrophone EQ bands", bands);
        } catch {}
    }

    // Compressor
    if (profile.compEnabled) {
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = profile.compThreshold || -20;
        compressor.ratio.value = profile.compRatio || 4;
        compressor.attack.value = profile.compAttack || 0.003;
        compressor.release.value = profile.compRelease || 0.1;
        compressor.knee.value = profile.compKnee || 30;
        try {
            logger.info("BetterMicrophone Compressor", {
                threshold: compressor.threshold.value,
                ratio: compressor.ratio.value,
                attack: compressor.attack.value,
                release: compressor.release.value,
                knee: compressor.knee.value
            });
        } catch {}
    }

    // Convolution Reverb
    if (profile.reverbEnabled) {
        convolver = ctx.createConvolver();
        convolver.buffer = createImpulseResponse(ctx, profile.reverbSeconds || 1.2, profile.reverbDecay || 2.5);
        try { convolver.normalize = true; } catch {}
        try {
            logger.info("BetterMicrophone Reverb", {
                seconds: profile.reverbSeconds || 1.2,
                decay: profile.reverbDecay || 2.5
            });
        } catch {}
    }

    // Wire chain
    let head: AudioNode = sourceNode;
    if (profile.eqEnabled && eqNodes.length) {
        for (const node of eqNodes) {
            head.connect(node);
            head = node;
        }
    }
    if (profile.compEnabled && compressor) {
        head.connect(compressor);
        head = compressor;
    }
    if (profile.reverbEnabled && convolver) {
        head.connect(convolver);
        head = convolver;
    }
    head.connect(masterGain!);
    masterGain!.connect(destinationNode);

    // Merge video tracks if present
    const out = destinationNode.stream;
    for (const track of stream.getVideoTracks()) out.addTrack(track);

    // Debug: log active processing chain
    try {
        logger.info("BetterMicrophone graph", {
            sampleRate: ctx.sampleRate,
            enableEffects: !!profile.enableEffects,
            eqEnabled: !!profile.eqEnabled,
            compEnabled: !!profile.compEnabled,
            reverbEnabled: !!profile.reverbEnabled,
            masterGain: profile.masterGain
        });
    } catch {}
    return out;
}

async function createProcessedMicStream(profile: any): Promise<MediaStream | null> {
    try {
        // Ensure processing context at 48k for stability even if Opus runs at 384k
        try {
            if (!audioContext || audioContext.sampleRate !== 48000) {
                if (audioContext) { try { await audioContext.close(); } catch {} }
                try { audioContext = new AudioContext({ sampleRate: 48000 }); } catch { audioContext = new AudioContext(); }
                logger.info("BetterMicrophone: audioContext reinitialized at 48k for processing");
            }
        } catch {}
        const constraints: MediaStreamConstraints = { audio: true };
        const raw = await (originalGetUserMedia ?? navigator.mediaDevices.getUserMedia).call(navigator.mediaDevices, constraints);
        const processed = buildGraph(raw, profile);
        lastProcessedStream = processed;
        return processed;
    } catch (e) {
        logger.error("BetterMicrophone: failed to create processed mic stream", e);
        return null;
    }
}

function replaceOutgoingAudioTrack(connection: any, profile: any) {
    try {
        let pc: RTCPeerConnection | undefined = getPeerConnectionFromAny(connection);
        if (!pc) {
            logger.info("BetterMicrophone RTC fallback: no RTCPeerConnection found — will retry until available", { keys: Object.keys(connection ?? {}) });
            let tries = 0;
            const waitInterval = setInterval(() => {
                tries++;
                pc = getPeerConnectionFromAny(connection);
                if (pc) {
                    clearInterval(waitInterval);
                    logger.info("BetterMicrophone RTC fallback: RTCPeerConnection resolved after retry", { tries });
                    // Proceed once available
                    setTimeout(() => replaceOutgoingAudioTrack(connection, profile), 0);
                } else if (tries >= 60) { // ~60 seconds
                    clearInterval(waitInterval);
                    logger.error("BetterMicrophone RTC fallback: failed to resolve RTCPeerConnection after timeout");
                }
            }, 1000);
            return;
        }
        const ensure = async () => {
            try {
                // Re-resolve in case the PC object changes during renegotiation
                pc = getPeerConnectionFromAny(connection) ?? pc;
                const sender = pc.getSenders?.().find((s: RTCRtpSender) => s.track && s.track.kind === "audio");
                if (!sender) { logger.info("BetterMicrophone RTC fallback: no audio sender yet"); return; }
                const processed = lastProcessedStream ?? await createProcessedMicStream(profile);
                const track = processed?.getAudioTracks?.()[0];
                if (!track) { logger.info("BetterMicrophone RTC fallback: processed track missing"); return; }
                await sender.replaceTrack(track);
                logger.info("BetterMicrophone RTC fallback: replaced outgoing audio track with processed stream");
            } catch (e) {
                logger.error("BetterMicrophone RTC fallback replaceTrack failed", e);
            }
        };
        // Try now and after small delay to survive renegotiations
        void ensure();
        setTimeout(ensure, 500);
        setTimeout(ensure, 1500);
        setTimeout(ensure, 3000);

        // Re-run periodically to survive device switches/renegotiation
        if (rtcFallbackInterval) clearInterval(rtcFallbackInterval);
        rtcFallbackInterval = setInterval(ensure, 2000);

        // Also hook common PC events
        const hook = () => void ensure();
        try {
            pc.addEventListener?.("negotiationneeded", hook);
            pc.addEventListener?.("signalingstatechange", hook);
            pc.addEventListener?.("connectionstatechange", hook);
            pc.addEventListener?.("iceconnectionstatechange", hook);
        } catch {}
    } catch {}
}

function installGlobalRTCOverrides(profileGetter: () => any) {
    try {
        if (!('RTCPeerConnection' in window)) return;
        if (!originalRTCPeerConnectionAddTrack) {
            originalRTCPeerConnectionAddTrack = (window as any).RTCPeerConnection.prototype.addTrack;
            (window as any).RTCPeerConnection.prototype.addTrack = function (track: MediaStreamTrack, ...rest: any[]) {
                try {
                    if (track?.kind === 'audio') {
                        const profile = profileGetter();
                        const useProcessed = async () => {
                            const processed = lastProcessedStream ?? await createProcessedMicStream(profile);
                            const pTrack = processed?.getAudioTracks?.()[0];
                            if (pTrack) {
                                try { return originalRTCPeerConnectionAddTrack!.call(this, pTrack, ...(processed ? [processed] : rest)); }
                                catch {}
                            }
                            return originalRTCPeerConnectionAddTrack!.call(this, track, ...rest);
                        };
                        // Best effort synchronous path not possible; block with deasync is bad → run sync by spinning event loop
                        // We return sender from original call immediately to keep behavior; then replace later
                        const sender: RTCRtpSender = originalRTCPeerConnectionAddTrack!.call(this, track, ...rest);
                        void (async () => {
                            try {
                                const processed = lastProcessedStream ?? await createProcessedMicStream(profile);
                                const pTrack = processed?.getAudioTracks?.()[0];
                                if (pTrack) {
                                    await sender.replaceTrack(pTrack);
                                    logger.info('BetterMicrophone global override: replaced track via addTrack hook');
                                }
                            } catch (e) {
                                logger.error('BetterMicrophone global override failed', e);
                            }
                        })();
                        return sender;
                    }
                } catch {}
                return originalRTCPeerConnectionAddTrack!.call(this, track, ...rest);
            };
            logger.info('BetterMicrophone: installed global RTCPeerConnection.addTrack override');
        }
    } catch {}
}

function wrapGetUserMedia() {
    if (originalGetUserMedia) return;
    originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
        const effective = constraints ?? {};
        const profile = microphoneStore.get().currentProfile;
        
        // If audio not requested or effects disabled, passthrough
        if (!effective.audio || !profile.enableEffects) {
            try { logger.info("BetterMicrophone: passthrough getUserMedia (effects disabled or no audio)"); } catch {}
            return originalGetUserMedia!(constraints);
        }

        // Force some capture constraints if requested
        // Clamp capture sampleRate to 48 kHz to prevent renegotiation/stutter
        const safeSampleRate = 384000;

        const audioConstraints: MediaTrackConstraints = {
            echoCancellation: profile.echoCancellation || false,
            noiseSuppression: profile.noiseSuppression || false,
            autoGainControl: profile.autoGainControl || false,
            channelCount: profile.forceStereo ? 2 : 1,
            sampleRate: safeSampleRate
        };

        const merged: MediaStreamConstraints = {
            ...effective,
            audio: typeof effective.audio === "object" ? { ...effective.audio as any, ...audioConstraints } : audioConstraints
        };
        try { logger.info("BetterMicrophone getUserMedia constraints", { effective, merged }); } catch {}

        const raw = await originalGetUserMedia!(merged);
        try {
            const audioTracks = raw.getAudioTracks();
            logger.info("BetterMicrophone raw stream", {
                audioTracks: audioTracks.map(t => ({ id: t.id, label: t.label, settings: (t.getSettings ? t.getSettings() : {}) })),
                videoTracks: raw.getVideoTracks().length
            });
        } catch {}
        try {
            const processed = buildGraph(raw, profile);
            try {
                const audioTracks = processed.getAudioTracks();
                logger.info("BetterMicrophone processed stream", {
                    audioTracks: audioTracks.map(t => ({ id: t.id, label: t.label, settings: (t.getSettings ? t.getSettings() : {}) }))
                });
            } catch {}
            return processed;
        } catch (e) {
            logger.error("VoiceEffectsStudio: Failed to build audio graph, using raw mic.", e);
            return raw;
        }
    };
}

function restoreGetUserMedia() {
    if (originalGetUserMedia) {
        navigator.mediaDevices.getUserMedia = originalGetUserMedia;
        originalGetUserMedia = null;
    }
}

export class MicrophonePatcher extends Patcher {
    private mediaEngineStore: types.MediaEngineStore;
    private mediaEngine: types.MediaEngine;
    public connection?: types.Connection;
    public oldSetTransportOptions: (...args: any[]) => void;
    public forceUpdateTransportationOptions: () => void;

    constructor() {
        super();
        this.mediaEngineStore = MediaEngineStore;
        this.mediaEngine = this.mediaEngineStore.getMediaEngine();
        this.oldSetTransportOptions = () => void 0;
        this.forceUpdateTransportationOptions = () => void 0;
    }

    public patch(): this {
        this.unpatch();

        const { get } = microphoneStore;

        // Start audio processing
        wrapGetUserMedia();
        installGlobalRTCOverrides(() => get().currentProfile);

        const connectionEventFunction =
            (connection: types.Connection) => {
                if (connection.context !== "default") return;

                this.connection = connection;

                const { oldSetTransportOptions, forceUpdateTransportationOptions } = patchConnectionAudioTransportOptions(connection, get, logger);

                this.oldSetTransportOptions = oldSetTransportOptions;
                this.forceUpdateTransportationOptions = forceUpdateTransportationOptions;

                // Fallback: ensure processed audio reaches RTC even if WebAudio path is bypassed
                try {
                    const profile = microphoneStore.get().currentProfile;
                    replaceOutgoingAudioTrack(connection, profile);
                } catch {}
            };

        Emitter.addListener(
            this.mediaEngine.emitter,
            "on",
            "connection",
            connectionEventFunction,
            PluginInfo.PLUGIN_NAME
        );

        return this;
    }

    public unpatch(): this {
        // Stop audio processing
        restoreGetUserMedia();
        teardownAll();
        if (rtcFallbackInterval) { try { clearInterval(rtcFallbackInterval); } catch {} rtcFallbackInterval = null; }
        
        return this._unpatch();
    }
}
