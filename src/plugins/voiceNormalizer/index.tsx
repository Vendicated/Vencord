/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";
import { Menu } from "@webpack/common";

const MediaEngineStore = findByPropsLazy("getMediaEngine");
const AudioActions = findByPropsLazy("setLocalVolume");

interface VolumeState {
    analyser: AnalyserNode;
    sourceNode: MediaStreamAudioSourceNode;
    audioContext: AudioContext;
    currentVolume: number;
    sampleBuffer: Float32Array;
    recentLevels: number[];
    monitorInterval: ReturnType<typeof setInterval> | null;
    lastAdjustmentTime: number;
}

export interface UserContextProps {
    channel: Channel,
    channelSelected: boolean,
    className: string,
    config: { context: string; };
    context: string,
    onHeightUpdate: Function,
    position: string,
    target: HTMLElement,
    theme: string,
    user: User;
}

const userVolumeStates: Map<string, VolumeState> = new Map();

// Minimum dB threshold to consider as actual speech (silence threshold)
const SILENCE_THRESHOLD_DB = -60;

const settings = definePluginSettings({
    targetDecibels: {
        type: OptionType.SLIDER,
        description: "Target volume level in decibels (dB). -20dB is a comfortable listening level.",
        markers: [-50, -40, -30, -20, -10, 0],
        default: -20,
        stickToMarkers: false,
    },
    adjustmentSpeed: {
        type: OptionType.SLIDER,
        description: "How quickly volume adjusts (1 = slow & smooth, 10 = fast & responsive)",
        markers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        default: 5,
        stickToMarkers: true,
    },
    sampleWindow: {
        type: OptionType.SLIDER,
        description: "Number of samples to average for volume detection (higher = more stable)",
        markers: [5, 10, 20, 30, 50],
        default: 20,
        stickToMarkers: true,
    },
    minimumVolume: {
        type: OptionType.NUMBER,
        description: "Minimum Discord volume to set (prevents complete muting)",
        default: 10,
    },
    maximumVolume: {
        type: OptionType.NUMBER,
        description: "Maximum Discord volume to set (prevents distortion)",
        default: 200,
    },
    enableLogging: {
        type: OptionType.BOOLEAN,
        description: "Enable debug logging to console",
        default: false,
    },

    blacklistedUserIds: {
        type: OptionType.STRING,
        description: "Blacklisted user IDs",
        default: "",
        hidden: true,
    },

});

function isBlacklisted(userId: string): boolean {
    console.log("isBlacklisted called with:", userId);
    const ids = settings.store.blacklistedUserIds;
    if (!ids) return false;
    return ids.split(",").includes(userId);
}

function toggleBlacklist(userId: string) {
    const ids = settings.store.blacklistedUserIds;
    const list = ids ? ids.split(",").filter(id => id) : [];

    if (list.includes(userId)) {
        settings.store.blacklistedUserIds = list.filter(id => id !== userId).join(",");
    } else {
        list.push(userId);
        settings.store.blacklistedUserIds = list.join(",");
        cleanupUser(userId);
    }
}

function log(...args: any[]) {
    if (settings.store.enableLogging) {
        console.log("[VoiceNormalizer]", ...args);
    }
}

function calculateRMS(dataArray: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
    }
    return Math.sqrt(sum / dataArray.length);
}

function rmsToDecibels(rms: number): number {
    if (rms === 0) return -Infinity;
    return 20 * Math.log10(rms);
}

function getAverageLevel(levels: number[]): number {
    if (levels.length === 0) return SILENCE_THRESHOLD_DB;
    const validLevels = levels.filter(l => l > SILENCE_THRESHOLD_DB);
    if (validLevels.length === 0) return SILENCE_THRESHOLD_DB;
    return validLevels.reduce((acc, cur) => acc + cur, 0) / validLevels.length;
}

function calculateRequiredVolume(rawDb: number, targetDb: number, currentDiscordVolume: number): number {
    if (rawDb <= SILENCE_THRESHOLD_DB) {
        return currentDiscordVolume;
    }

    const gainDb = 20 * Math.log10(currentDiscordVolume / 100);
    const effectiveDb = rawDb + gainDb;

    const dbDifference = targetDb - effectiveDb;

    const multiplier = Math.pow(10, dbDifference / 20);
    let newVolume = currentDiscordVolume * multiplier;

    newVolume = Math.max(settings.store.minimumVolume, Math.min(settings.store.maximumVolume, newVolume));

    return Math.round(newVolume);
}

function setUserVolume(userId: string, volume: number) {
    try {
        AudioActions.setLocalVolume(userId, volume);
        log(`Set volume for ${userId} to ${volume}`);
    } catch (e) {
        console.error("[VoiceNormalizer] Failed to set volume:", e);
    }
}

function getUserVolume(userId: string): number {
    try {
        const volume = MediaEngineStore.getLocalVolume(userId);
        if (volume !== undefined && volume !== null) {
            return volume;
        }
    } catch (e) {
        log("Could not get user volume:", e);
    }
    return 100; // Default Discord volume
}

function getVoiceConnection(context: string = "default"): any {
    try {
        const mediaEngine = MediaEngineStore.getMediaEngine();
        if (!mediaEngine?.connections) return null;

        for (const conn of mediaEngine.connections) {
            if (conn.context === context && conn.connectionState === "CONNECTED") {
                return conn;
            }
        }
    } catch (e) {
        log("Error getting voice connection:", e);
    }
    return null;
}

function getUserOutputStream(userId: string): any {
    const conn = getVoiceConnection("default");
    if (conn?.outputs?.[userId]) {
        return { output: conn.outputs[userId], connection: conn };
    }

    return null;
}

function initializeUserMonitoring(userId: string): boolean {
    if (userVolumeStates.has(userId)) {
        log(`Already monitoring user ${userId}`);
        return true;
    }

    const result = getUserOutputStream(userId);
    if (!result) {
        log(`No output stream found for user ${userId}`);
        return false;
    }

    const { stream } = result.output;

    if (!stream || !stream.active) {
        log(`Stream not active for user ${userId}`);
        return false;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
        log(`No audio tracks for user ${userId}`);
        return false;
    }

    try {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;

        const sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNode.connect(analyser);

        const state: VolumeState = {
            analyser,
            sourceNode,
            audioContext,
            currentVolume: getUserVolume(userId),
            sampleBuffer: new Float32Array(analyser.fftSize),
            recentLevels: [],
            monitorInterval: null,
            lastAdjustmentTime: Date.now(),
        };

        // Start monitoring loop
        state.monitorInterval = setInterval(() => {
            processUserAudio(userId, state);
        }, 100);

        userVolumeStates.set(userId, state);
        log(`Started monitoring user ${userId}, current volume: ${state.currentVolume}`);
        return true;
    } catch (e) {
        console.error("[VoiceNormalizer] Failed to initialize monitoring:", e);
        return false;
    }
}

function processUserAudio(userId: string, state: VolumeState) {
    if (!state.analyser) return;

    try {
        state.analyser.getFloatTimeDomainData(state.sampleBuffer);

        const rms = calculateRMS(state.sampleBuffer);
        const db = rmsToDecibels(rms);

        // Debug: show current dB level
        if (settings.store.enableLogging && db > SILENCE_THRESHOLD_DB) {
            log(`User ${userId} current dB: ${db.toFixed(1)}`);
        }

        // Only track non-silent samples
        if (db > SILENCE_THRESHOLD_DB) {
            state.recentLevels.push(db);

            while (state.recentLevels.length > settings.store.sampleWindow) {
                state.recentLevels.shift();
            }
        } else {
            // User is silent
            return;
        }

        // Calculate average level
        const averageDb = getAverageLevel(state.recentLevels);

        // Need enough samples and not silent
        if (state.recentLevels.length < 3 || averageDb <= SILENCE_THRESHOLD_DB) {
            return;
        }

        // Get current volume from Discord (it might have been changed manually)
        const currentDiscordVolume = getUserVolume(userId);
        state.currentVolume = currentDiscordVolume;

        // Calculate required volume
        const targetDb = settings.store.targetDecibels;
        const requiredVolume = calculateRequiredVolume(averageDb, targetDb, currentDiscordVolume);

        // Apply smoothing
        const smoothingFactor = settings.store.adjustmentSpeed / 100;
        const smoothedVolume = Math.round(
            currentDiscordVolume + (requiredVolume - currentDiscordVolume) * smoothingFactor
        );

        // Only update if meaningful change
        if (Math.abs(smoothedVolume - currentDiscordVolume) >= 1) {
            state.currentVolume = smoothedVolume;
            setUserVolume(userId, smoothedVolume);
            const gainDb = 20 * Math.log10(currentDiscordVolume / 100);
            const effectiveDb = averageDb + gainDb;
            log(`User ${userId}: raw=${averageDb.toFixed(1)}dB, effective=${effectiveDb.toFixed(1)}dB, target=${targetDb}dB, volume: ${currentDiscordVolume} -> ${smoothedVolume}`);
        }
    } catch (e) {
        log("Error processing audio:", e);
    }
}

function cleanupUser(userId: string) {
    const state = userVolumeStates.get(userId);
    if (state) {
        if (state.monitorInterval) {
            clearInterval(state.monitorInterval);
        }
        try {
            state.sourceNode?.disconnect();
            state.audioContext?.close();
        } catch (e) {
            // Ignore cleanup errors
        }
        userVolumeStates.delete(userId);
        log(`Stopped monitoring user ${userId}`);
    }
}

function cleanupAllUsers() {
    for (const userId of userVolumeStates.keys()) {
        cleanupUser(userId);
    }
}

// Periodically check for new users to monitor
let scanInterval: ReturnType<typeof setInterval> | null = null;

function scanForUsers() {
    const currentUserId = UserStore.getCurrentUser()?.id;

    try {
        const mediaEngine = MediaEngineStore.getMediaEngine();
        if (!mediaEngine?.connections) return;

        const activeUserIds = new Set<string>();

        for (const conn of mediaEngine.connections) {
            if (conn.connectionState !== "CONNECTED") continue;

            if (conn.outputs) {
                for (const userId of Object.keys(conn.outputs)) {
                    if (userId === currentUserId || isBlacklisted(userId)) continue;

                    activeUserIds.add(userId);

                    if (!userVolumeStates.has(userId)) {
                        log(`Found new user ${userId}, initializing monitoring...`);
                        initializeUserMonitoring(userId);
                    }
                }
            }
        }

        // Cleanup users who are no longer in voice
        for (const userId of userVolumeStates.keys()) {
            if (!activeUserIds.has(userId)) {
                log(`User ${userId} no longer in voice, cleaning up`);
                cleanupUser(userId);
            }
        }
    } catch (e) {
        log("Error scanning for users:", e);
    }
}

export const userContextPatch: NavContextMenuPatchCallback = (children, { user }: userContextProps) => {
    const VoiceNormalizationToggle = (
        <Menu.MenuCheckboxItem
            id="voice-normalization-toggle"
            label="Disable Voice Normalization"
            checked={isBlacklisted(user.id)}
            action={() => toggleBlacklist(user.id)}
        />
    );
    children.push(<Menu.MenuSeparator />, VoiceNormalizationToggle);
};

export default definePlugin({
    name: "VoiceNormalizer",
    description: "Automatically adjusts voice chat volumes to maintain a consistent listening level across all speakers",
    authors: [{
        name: "omniologist"
    }
    ],
    settings,
    contextMenus: {
        "user-context": userContextPatch
    },
    flux: {
        SPEAKING(event: { userId: string; speakingFlags: number; context: string; }) {
            const { userId, speakingFlags, context } = event;
            const currentUserId = UserStore.getCurrentUser()?.id;

            if (userId === currentUserId) return;

            log(`SPEAKING event: user=${userId}, flags=${speakingFlags}, context=${context}`);

            // When someone starts speaking, try to initialize monitoring if not already
            if (speakingFlags > 0 && !userVolumeStates.has(userId) && !isBlacklisted(userId)) {
                // Small delay to ensure audio stream is ready
                setTimeout(() => {
                    initializeUserMonitoring(userId);
                }, 500);
            }
        },

        VOICE_STATE_UPDATES(event: { voiceStates: Array<{ userId: string; channelId: string | null; }>; }) {
            for (const state of event.voiceStates) {
                if (state.channelId === null) {
                    cleanupUser(state.userId);
                }
            }
        },

        RTC_CONNECTION_STATE(event: { state: string; context: string; }) {
            log(`RTC state: ${event.state}, context: ${event.context}`);
            if (event.state === "RTC_DISCONNECTED") {
                cleanupAllUsers();
            }
        },
    },

    start() {
        log("VoiceNormalizer started");
        log("Settings:", {
            targetDecibels: settings.store.targetDecibels,
            adjustmentSpeed: settings.store.adjustmentSpeed,
            sampleWindow: settings.store.sampleWindow,
            minimumVolume: settings.store.minimumVolume,
            maximumVolume: settings.store.maximumVolume,
        });

        // Scan for users every 2 seconds
        scanInterval = setInterval(scanForUsers, 2000);

        // Initial scan
        setTimeout(scanForUsers, 1000);
    },

    stop() {
        log("VoiceNormalizer stopping");
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }
        cleanupAllUsers();
    },
});
