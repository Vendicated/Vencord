/*
 * Gemini Mic Transcription — Vencord userplugin
 * Copyright (c) 2026 Yashjit
 * SPDX-License-Identifier: MIT
 */

import { useState, useRef, useEffect, Toasts } from "@webpack/common";
import { findStoreLazy } from "@webpack";
import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import type { MouseEvent } from "react";
import style from "./styles.css?managed";

const MediaEngineStore = findStoreLazy("MediaEngineStore") as any;
let logSocket: WebSocket | null = null;
const logQueue: Array<{type: string, content: any}> = [];

const sendLog = (type: string, content: any) => {
    try {
        const text = `${type}: ${JSON.stringify(content)}`;
        VencordNative.pluginHelpers.GeminiMicTranscribe.writeLog(text).catch(() => {});
    } catch {}

    try {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] ${type}: ${JSON.stringify(content)}\n`;
        const currentLogs = settings.store.diagnosticLogs || "";
        const newLogs = (currentLogs + entry).slice(-15000);
        settings.store.diagnosticLogs = newLogs;
    } catch {}

    try {
        if (!logSocket || logSocket.readyState !== WebSocket.OPEN) {
            logQueue.push({ type, content });
            if (!logSocket || logSocket.readyState === WebSocket.CLOSED) {
                logSocket = new WebSocket("ws://127.0.0.1:9999");
                logSocket.onopen = () => {
                    while (logQueue.length > 0) {
                        const item = logQueue.shift();
                        if (item) logSocket?.send(JSON.stringify(item));
                    }
                };
            }
        } else {
            logSocket.send(JSON.stringify({ type, content }));
        }
    } catch {}
};

const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "Gemini API Key (Get yours from Google AI Studio)",
        default: ""
    },
    model: {
        type: OptionType.STRING,
        description: "Gemini Live model to use (e.g. gemini-3.1-flash-live-preview)",
        default: "gemini-3.1-flash-live-preview"
    },
    holdToRecord: {
        type: OptionType.BOOLEAN,
        description: "Hold to record (if false, click to start/stop)",
        default: false
    },
    diagnosticLogs: {
        type: OptionType.STRING,
        description: "Internal diagnostic logs",
        default: ""
    }
});

const MicIcon = ({ className, color, size = 18 }: { className?: string; color?: string; size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color ?? "currentColor"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
);

const SpinnerIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${className} vc-gemini-spin`}
    >
        <line x1="12" x2="12" y1="2" y2="6" />
        <line x1="12" x2="12" y1="18" y2="22" />
        <line x1="4.93" x2="7.76" y1="4.93" y2="7.76" />
        <line x1="16.24" x2="19.07" y1="16.24" y2="19.07" />
        <line x1="2" x2="6" y1="12" y2="12" />
        <line x1="18" x2="22" y1="12" y2="12" />
        <line x1="4.93" x2="7.76" y1="19.07" y2="16.24" />
        <line x1="16.24" x2="19.07" y1="7.76" y2="4.93" />
    </svg>
);

const PauseIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
);

const getIncrementalText = (oldStr: string, newStr: string): string => {
    if (!newStr) return "";
    if (!oldStr) return newStr;
    
    if (newStr.startsWith(oldStr)) {
        return newStr.substring(oldStr.length);
    }
    
    const oldWords = oldStr.trim().split(/\s+/).filter(Boolean);
    const newWords = newStr.trim().split(/\s+/).filter(Boolean);
    
    let matchCount = 0;
    while (matchCount < oldWords.length && matchCount < newWords.length && 
           oldWords[matchCount].toLowerCase() === newWords[matchCount].toLowerCase()) {
        matchCount++;
    }
    
    const remainingWords = newWords.slice(matchCount);
    if (remainingWords.length === 0) return "";
    
    return (matchCount > 0 ? " " : "") + remainingWords.join(" ");
};

const downsampleBuffer = (buffer: Float32Array, inputSampleRate: number, outputSampleRate: number = 16000): Float32Array => {
    if (inputSampleRate === outputSampleRate) {
        return buffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
};

// Downsample Float32 mic audio chunks to 16-bit Mono PCM (16kHz)
const convertFloat32To16BitPCM = (float32Array: Float32Array): Int16Array => {
    const buffer = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buffer;
};

// Convert Int16Array PCM buffer to a raw base64 string
const int16ArrayToBase64 = (int16Array: Int16Array): string => {
    const buffer = int16Array.buffer;
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const GeminiMicButton: ChatBarButtonFactory = (props) => {
    const [state, setState] = useState<"idle" | "recording" | "processing">("idle");

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const currentSegmentTextRef = useRef<string>("");
    const lastInsertedSegmentTextRef = useRef<string>("");

    useEffect(() => {
        const apiKey = settings.store.apiKey;
        if (!apiKey) return;

        const runDiagnostic = async () => {
            const diagnosticSendLog = (type: string, content: any) => {
                sendLog("diagnostic_" + type, content);
            };

            const model = settings.store.model || "gemini-2.0-flash-exp";
            const cleanModel = model.startsWith("models/") ? model : `models/${model}`;
            const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

            diagnosticSendLog("init", { url, cleanModel, apiKeyLength: apiKey.length });

            try {
                const ws = new WebSocket(url);
                ws.onopen = () => {
                    diagnosticSendLog("open", { message: "Opened successfully" });
                    const setupMessage = {
                        setup: {
                            model: cleanModel,
                            generationConfig: { responseModalities: ["TEXT"] },
                            inputAudioTranscription: {}
                        }
                    };
                    ws.send(JSON.stringify(setupMessage));
                };
                ws.onmessage = (e) => {
                    diagnosticSendLog("message", { data: e.data });
                    ws.close();
                };
                ws.onerror = (e: any) => {
                    diagnosticSendLog("error", { message: e?.message, type: e?.type });
                };
                ws.onclose = (e) => {
                    diagnosticSendLog("close", { code: e.code, reason: e.reason, wasClean: e.wasClean });
                };
            } catch (err: any) {
                diagnosticSendLog("catch", { message: err.message, stack: err.stack });
            }
        };

        const timer = setTimeout(runDiagnostic, 5000);
        return () => clearTimeout(timer);
    }, []);

    const cleanupLive = () => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (audioContextRef.current) {
            if (audioContextRef.current.state !== "closed") {
                audioContextRef.current.close().catch(() => {});
            }
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (wsRef.current) {
            if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
                wsRef.current.close();
            }
            wsRef.current = null;
        }
    };

    const startRecordingLive = async () => {
        const apiKey = settings.store.apiKey;
        if (!apiKey) {
            Toasts.show({
                message: "Gemini API Key is required. Please set it in settings.",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId()
            });
            return;
        }

        try {
            cleanupLive();
            currentSegmentTextRef.current = "";
            lastInsertedSegmentTextRef.current = "";

            // Establish WebSocket connection to Gemini Multimodal Live API
            const model = settings.store.model || "gemini-2.0-flash-exp";
            const cleanModel = model.startsWith("models/") ? model : `models/${model}`;
            
            const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
            sendLog("connection_init", { url, cleanModel, apiKeyLength: apiKey?.length || 0 });
            
            const ws = new WebSocket(url);
            wsRef.current = ws;

            // Wait for the WebSocket to connect AND receive the setup complete response
            await new Promise<void>((resolve, reject) => {
                let isDone = false;

                ws.onopen = () => {
                    sendLog("ws_open", { message: "WebSocket connection opened successfully" });
                    // Send configuration immediately on connect
                    const setupMessage = {
                        setup: {
                            model: cleanModel,
                            generationConfig: {
                                responseModalities: ["AUDIO"]
                            },
                            inputAudioTranscription: {},
                            systemInstruction: {
                                parts: [
                                    { text: "You are a silent speech-to-text transcriber. Do not speak back, do not reply, do not output any synthesized audio. Remaining completely silent and allowing inputAudioTranscription to run is your sole task." }
                                ]
                            }
                        }
                    };
                    sendLog("ws_send_setup", setupMessage);
                    ws.send(JSON.stringify(setupMessage));
                };

                ws.onmessage = async (event) => {
                    try {
                        let textContent = "";
                        if (event.data instanceof Blob) {
                            textContent = await event.data.text();
                        } else if (typeof event.data === "string") {
                            textContent = event.data;
                        } else {
                            textContent = String(event.data);
                        }
                        sendLog("ws_message_received_text", { text: textContent });
                        const data = JSON.parse(textContent);
                        if (data.setupComplete) {
                            sendLog("ws_setup_complete", data);
                            isDone = true;
                            resolve();
                        } else if (data.error) {
                            sendLog("ws_setup_error", data.error);
                            isDone = true;
                            reject(new Error(`Gemini: ${data.error.message || JSON.stringify(data.error)}`));
                        }
                    } catch (err: any) {
                        sendLog("ws_message_parse_failed", { error: err.message });
                    }
                };

                ws.onerror = (e: any) => {
                    sendLog("ws_error", {
                        message: e?.message,
                        type: e?.type,
                        keys: Object.keys(e || {})
                    });
                    if (!isDone) {
                        isDone = true;
                        reject(new Error("Network error: Could not connect to Gemini Live."));
                    }
                };

                ws.onclose = (e) => {
                    sendLog("ws_close", {
                        code: e.code,
                        reason: e.reason,
                        wasClean: e.wasClean
                    });
                    if (!isDone) {
                        isDone = true;
                        reject(new Error(e.reason ? `Gemini API rejected connection: ${e.reason}` : `Connection closed unexpectedly (code ${e.code})`));
                    }
                };

                // Timeout after 15 seconds
                setTimeout(() => {
                    if (!isDone) {
                        sendLog("ws_timeout", { message: "15s timeout reached" });
                        isDone = true;
                        reject(new Error("Connection to Gemini Live timed out after 15 seconds."));
                    }
                }, 15000);
            });

            // Now set the real message handler for transcription
            ws.onmessage = async (event) => {
                try {
                    let textContent = "";
                    if (event.data instanceof Blob) {
                        textContent = await event.data.text();
                    } else if (typeof event.data === "string") {
                        textContent = event.data;
                    } else {
                        textContent = String(event.data);
                    }
                    const response = JSON.parse(textContent);
                    const serverContent = response.serverContent;
                    
                    if (serverContent) {
                        // Check for turnComplete signal to conclude this segment and prepare spacing for the next
                        if (serverContent.turnComplete) {
                            lastInsertedSegmentTextRef.current = "";
                            currentSegmentTextRef.current = "";
                            
                            // Cleanly insert a trailing space if the prompt box doesn't end in one
                            const textbox = document.querySelector('[role="textbox"]') as HTMLElement;
                            const currentText = textbox ? textbox.textContent || "" : "";
                            if (currentText && !currentText.endsWith(" ")) {
                                insertTextIntoChatInputBox(" ");
                            }
                        }
                        
                        // Check for incoming user transcription and stream it incrementally in real-time
                        if (serverContent.inputTranscription) {
                            const text = serverContent.inputTranscription.text;
                            if (text && text.trim()) {
                                currentSegmentTextRef.current = text;
                                
                                const incremental = getIncrementalText(lastInsertedSegmentTextRef.current, text);
                                if (incremental) {
                                    const textbox = document.querySelector('[role="textbox"]') as HTMLElement;
                                    const currentText = textbox ? textbox.textContent || "" : "";
                                    
                                    let textToInsert = incremental;
                                    // Prepend space only on the first word of a segment if needed
                                    if (!lastInsertedSegmentTextRef.current && currentText && !currentText.endsWith(" ")) {
                                        textToInsert = " " + textToInsert;
                                    }
                                    
                                    insertTextIntoChatInputBox(textToInsert);
                                    lastInsertedSegmentTextRef.current = text;
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Silently ignore parse errors on individual messages
                }
            };

            ws.onerror = () => {
                // Runtime error after connection established
                cleanupLive();
                setState("idle");
            };

            // Grab audio using Discord's selected input device
            let audioConstraints: MediaStreamConstraints["audio"] = true;
            try {
                const deviceId = MediaEngineStore?.getInputDeviceId?.();
                if (deviceId) {
                    audioConstraints = { deviceId: { exact: deviceId } };
                }
            } catch { }
            
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
            } catch (err: any) {
                sendLog("get_user_media_failed_retrying_default", { error: String(err) });
                // Fallback to standard default system microphone audio acquisition
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = audioContext;
            
            try {
                if (audioContext.state === "suspended") {
                    await audioContext.resume();
                    sendLog("audio_context_resumed", { state: audioContext.state });
                }
            } catch (err: any) {
                sendLog("audio_context_resume_failed", { error: String(err) });
            }

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = audioContext.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const inputSampleRate = e.inputBuffer.sampleRate;
                
                // Downsample from hardware rate (e.g. 48kHz) to target 16kHz
                const downsampled = downsampleBuffer(inputData, inputSampleRate, 16000);
                
                const pcm16 = convertFloat32To16BitPCM(downsampled);
                const base64 = int16ArrayToBase64(pcm16);

                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        realtimeInput: {
                            audio: {
                                data: base64,
                                mimeType: "audio/pcm;rate=16000"
                            }
                        }
                    }));
                }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);
            setState("recording");

        } catch (err: any) {
            console.error("[GeminiMicTranscribe] Live start error:", err);
            Toasts.show({
                message: `Failed: ${err.message || err}`,
                type: Toasts.Type.FAILURE,
                id: Toasts.genId()
            });
            cleanupLive();
            setState("idle");
        }
    };

    const stopRecordingLive = () => {
        setState("processing");
        
        // Wait 800ms for any trailing transcription frames to arrive from Google's VAD
        setTimeout(() => {
            let hasAddedTrailing = false;
            
            if (currentSegmentTextRef.current) {
                const text = currentSegmentTextRef.current;
                const incremental = getIncrementalText(lastInsertedSegmentTextRef.current, text);
                if (incremental) {
                    const textbox = document.querySelector('[role="textbox"]') as HTMLElement;
                    const currentText = textbox ? textbox.textContent || "" : "";
                    
                    let textToInsert = incremental;
                    if (!lastInsertedSegmentTextRef.current && currentText && !currentText.endsWith(" ")) {
                        textToInsert = " " + textToInsert;
                    }
                    insertTextIntoChatInputBox(textToInsert);
                    hasAddedTrailing = true;
                }
                currentSegmentTextRef.current = "";
                lastInsertedSegmentTextRef.current = "";
            }
            
            // Cleanly insert a trailing space if the prompt box doesn't end in one
            const textbox = document.querySelector('[role="textbox"]') as HTMLElement;
            const currentText = textbox ? textbox.textContent || "" : "";
            if (currentText && !currentText.endsWith(" ")) {
                insertTextIntoChatInputBox(" ");
            }
            
            // If the textbox is completely empty, trigger "No speech detected"
            if (!currentText.trim() && !hasAddedTrailing) {
                Toasts.show({
                    message: "No speech detected.",
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId()
                });
            }
            
            cleanupLive();
            setState("idle");
        }, 800);
    };

    // Auto-cleanup on unmount
    useEffect(() => {
        return cleanupLive;
    }, []);

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return; // Left click only
        if (settings.store.holdToRecord) {
            startRecordingLive();
        }
    };

    const handleMouseUp = () => {
        if (settings.store.holdToRecord && state === "recording") {
            stopRecordingLive();
        }
    };

    const handleMouseLeave = () => {
        if (settings.store.holdToRecord && state === "recording") {
            stopRecordingLive();
        }
    };

    const handleClick = () => {
        if (!settings.store.holdToRecord) {
            if (state === "idle") {
                startRecordingLive();
            } else if (state === "recording") {
                stopRecordingLive();
            }
        }
    };

    let tooltip = "Transcribe Voice via Gemini Live (Click to Record)";
    if (settings.store.holdToRecord) {
        tooltip = "Transcribe Voice via Gemini Live (Hold to Record)";
    }
    if (state === "recording") {
        tooltip = settings.store.holdToRecord ? "Recording (Release to finish)" : "Recording (Click to stop)";
    } else if (state === "processing") {
        tooltip = "Completing transcription...";
    }

    return (
        <ChatBarButton
            tooltip={tooltip}
            onClick={handleClick}
            buttonProps={{
                onMouseDown: handleMouseDown,
                onMouseUp: handleMouseUp,
                onMouseLeave: handleMouseLeave
            }}
        >
            {state === "processing" ? (
                <SpinnerIcon />
            ) : state === "recording" ? (
                <PauseIcon className="vc-gemini-mic-pulse" />
            ) : (
                <MicIcon />
            )}
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "GeminiMicTranscribe",
    description: "Replaces the Nitro gift button with a microphone that connects to the Gemini Multimodal Live API for real-time transcription.",
    authors: [{ name: "Yashjit", id: 112233445566778899n }],
    settings,

    start() {
        console.log("[Gemini] Plugin start() executed!");
        const apiKey = settings.store.apiKey;
        if (!apiKey) {
            console.error("[Gemini] API Key missing on startup!");
            return;
        }

    },

    chatBarButton: {
        icon: MicIcon as IconComponent,
        render: GeminiMicButton
    },

    managedStyle: style
});
