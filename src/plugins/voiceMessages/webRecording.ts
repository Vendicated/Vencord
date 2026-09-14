/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import { Logger } from "@utils/Logger";

import { isOggOpus, OGG_OPUS_TYPE, OggOpusMuxer, remuxWebmOpusToOgg } from "./oggOpus";

const logger = new Logger("VoiceMessages");

const SAMPLE_RATE = 48_000;
const BITRATE = 32_000;
const FRAME_DURATION_US = 20_000;
const OGG_TYPES = ["audio/ogg; codecs=opus", "audio/ogg;codecs=opus"];
const WEBM_TYPES = ["audio/webm;codecs=opus", "audio/webm; codecs=opus", "audio/webm"];

export interface OggOpusRecording {
    pause(): void;
    resume(): void;
    stop(): Promise<Blob>;
}

type OpusEncoderConfig = AudioEncoderConfig & {
    opus?: {
        application?: "voip" | "audio" | "lowdelay";
        frameDuration?: number;
    };
};

function asBytes(src: AllowSharedBufferSource) {
    if (ArrayBuffer.isView(src)) {
        return new Uint8Array(src.buffer, src.byteOffset, src.byteLength);
    }
    return new Uint8Array(src);
}

function preSkipFromDescription(description?: AllowSharedBufferSource) {
    if (description == null) return 0;
    const bytes = asBytes(description);
    if (bytes.length < 12) return 0;
    if (new TextDecoder().decode(bytes.subarray(0, 8)) !== "OpusHead") return 0;
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(10, true);
}

function chunkSamples(chunk: EncodedAudioChunk) {
    if (chunk.duration == null) return 960;
    return Math.max(1, Math.round(chunk.duration * SAMPLE_RATE / 1_000_000));
}

function firstSupportedType(types: string[]) {
    return types.find(type => MediaRecorder.isTypeSupported(type));
}

function createAudioContext() {
    try {
        return new AudioContext({ sampleRate: SAMPLE_RATE });
    } catch {
        return new AudioContext();
    }
}

function resample(input: Float32Array, fromRate: number) {
    if (fromRate === SAMPLE_RATE) return input;

    const outLength = Math.max(1, Math.round(input.length * SAMPLE_RATE / fromRate));
    const output = new Float32Array(outLength);
    const step = fromRate / SAMPLE_RATE;
    for (let i = 0; i < outLength; i++) {
        const srcPos = i * step;
        const i0 = Math.min(input.length - 1, Math.floor(srcPos));
        const i1 = Math.min(input.length - 1, i0 + 1);
        output[i] = input[i0]! + (input[i1]! - input[i0]!) * (srcPos - i0);
    }
    return output;
}

function pcmBuffer(input: Float32Array) {
    const copy = new ArrayBuffer(input.byteLength);
    new Float32Array(copy).set(input);
    return copy;
}

async function supportedOpusConfig(): Promise<OpusEncoderConfig | null> {
    if (typeof AudioEncoder === "undefined") return null;

    const withVoip: OpusEncoderConfig = {
        codec: "opus",
        sampleRate: SAMPLE_RATE,
        numberOfChannels: 1,
        bitrate: BITRATE,
        opus: {
            application: "voip",
            frameDuration: FRAME_DURATION_US,
        },
    };
    const basic: OpusEncoderConfig = {
        codec: "opus",
        sampleRate: SAMPLE_RATE,
        numberOfChannels: 1,
        bitrate: BITRATE,
    };

    for (const config of [withVoip, basic]) {
        try {
            if (AudioEncoder.isConfigSupported && !(await AudioEncoder.isConfigSupported(config)).supported) {
                continue;
            }
            return config;
        } catch { }
    }

    return basic;
}

function createRecorder(stream: MediaStream, mimeType?: string) {
    const attempts: MediaRecorderOptions[] = [];
    if (mimeType) attempts.push({ mimeType, audioBitsPerSecond: BITRATE }, { mimeType });
    attempts.push({ audioBitsPerSecond: BITRATE }, {});

    for (const options of attempts) {
        try {
            return new MediaRecorder(stream, options);
        } catch { }
    }

    return new MediaRecorder(stream);
}

async function toOgg(blob: Blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (isOggOpus(bytes)) return new Blob([bytes], { type: OGG_OPUS_TYPE });
    return remuxWebmOpusToOgg(bytes);
}

function startMediaRecorder(stream: MediaStream, mimeType?: string): OggOpusRecording {
    const chunks: Blob[] = [];
    const recorder = createRecorder(stream, mimeType);
    recorder.addEventListener("dataavailable", e => {
        if (e.data.size) chunks.push(e.data);
    });
    recorder.start();

    return {
        pause: () => recorder.pause(),
        resume: () => recorder.resume(),
        stop: () => new Promise((resolve, reject) => {
            recorder.addEventListener("error", () => reject(new Error("Recording failed")), { once: true });
            recorder.addEventListener("stop", () => {
                stream.getTracks().forEach(track => track.stop());
                toOgg(new Blob(chunks)).then(resolve, reject);
            }, { once: true });
            recorder.stop();
        }),
    };
}

async function startWebCodecsRecording(stream: MediaStream, config: OpusEncoderConfig): Promise<OggOpusRecording> {
    const muxer = new OggOpusMuxer(1, SAMPLE_RATE);
    const ctx = createAudioContext();
    let encoder: AudioEncoder | undefined;

    try {
        await ctx.resume().catch(() => { });
        if (typeof ctx.createScriptProcessor !== "function") {
            throw new Error("ScriptProcessor is unavailable");
        }

        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(2048, 2, 1);
        const sink = ctx.createMediaStreamDestination();
        let paused = false;
        let stopped = false;
        let timestampUs = 0;

        encoder = new AudioEncoder({
            output(chunk, metadata) {
                const description = metadata?.decoderConfig?.description;
                if (description) muxer.setPreSkip(preSkipFromDescription(description));
                const packet = new Uint8Array(chunk.byteLength);
                chunk.copyTo(packet);
                muxer.writePacket(packet, chunkSamples(chunk));
            },
            error(error) {
                logger.error("Opus encoder error", error);
            },
        });
        encoder.configure(config);
        const opusEncoder = encoder;

        processor.onaudioprocess = event => {
            if (paused || stopped || opusEncoder.state !== "configured") return;

            const { inputBuffer } = event;
            const frames = inputBuffer.length;
            const mono = new Float32Array(frames);
            const left = inputBuffer.getChannelData(0);
            if (inputBuffer.numberOfChannels > 1) {
                const right = inputBuffer.getChannelData(1);
                for (let i = 0; i < frames; i++) mono[i] = (left[i] + right[i]) / 2;
            } else {
                mono.set(left);
            }

            const pcm = resample(mono, ctx.sampleRate);
            const audioData = new AudioData({
                format: "f32-planar",
                sampleRate: SAMPLE_RATE,
                numberOfFrames: pcm.length,
                numberOfChannels: 1,
                timestamp: timestampUs,
                data: pcmBuffer(pcm),
            });
            timestampUs += Math.round(pcm.length / SAMPLE_RATE * 1e6);
            try {
                opusEncoder.encode(audioData);
            } catch (error) {
                logger.error("Failed to encode audio frame", error);
            }
            audioData.close();
        };

        source.connect(processor);
        processor.connect(sink);

        const cleanup = () => {
            stopped = true;
            processor.onaudioprocess = null;
            source.disconnect();
            processor.disconnect();
            sink.disconnect();
            stream.getTracks().forEach(track => track.stop());
            void ctx.close();
        };

        return {
            pause: () => { paused = true; },
            resume: () => { paused = false; },
            async stop() {
                cleanup();
                if (opusEncoder.state === "configured") {
                    try {
                        await opusEncoder.flush();
                        opusEncoder.close();
                    } catch { }
                }
                return muxer.finalize();
            },
        };
    } catch (error) {
        try { encoder?.close(); } catch { }
        void ctx.close();
        throw error;
    }
}

export async function startOggOpusRecording(stream: MediaStream): Promise<OggOpusRecording> {
    const oggType = firstSupportedType(OGG_TYPES);
    if (oggType) {
        try {
            return startMediaRecorder(stream, oggType);
        } catch (error) {
            logger.error("Native Ogg MediaRecorder failed", error);
        }
    }

    const opusConfig = await supportedOpusConfig();
    if (opusConfig) {
        try {
            return await startWebCodecsRecording(stream, opusConfig);
        } catch (error) {
            logger.error("WebCodecs Opus recording failed, trying MediaRecorder", error);
        }
    }

    try {
        return startMediaRecorder(stream, firstSupportedType(WEBM_TYPES));
    } catch (error) {
        logger.error("MediaRecorder start failed", error);
        stream.getTracks().forEach(track => track.stop());
        throw new Error("Failed to start recording");
    }
}
