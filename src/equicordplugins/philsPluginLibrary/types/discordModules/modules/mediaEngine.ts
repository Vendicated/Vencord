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

import TypedEmitter from "typed-emitter";

import { Connection } from "./";

export const MediaEngineEvent = {
    REMOVE_LISTENER: "removeListener",
    NEW_LISTENER: "newListener",
    DESTORY: "destroy",
    CONNECTION: "connection",
    DEVICE_CHANGE: "devicechange",
    VOLUME_CHANGE: "volumechange",
    DESKTOP_SOURCE_END: "desktopsourceend",
    AUDIO_PERMISSION: "audio-permission",
    VIDEO_PERMISSION: "video-permission",
    WATCHDOG_TIMEOUT: "watchdogtimeout",
    VIDEO_INPUT_INITIALIZED: "video-input-initialized",
    CONNECTION_STATS: "connection-stats",
} as const;

export type MediaEngineEvents = {
    [MediaEngineEvent.REMOVE_LISTENER]: (...args: any[]) => any;
    [MediaEngineEvent.NEW_LISTENER]: (...args: any[]) => any;
    [MediaEngineEvent.DESTORY]: (...args: any[]) => any;
    [MediaEngineEvent.CONNECTION]: (connection: Connection) => void;
    [MediaEngineEvent.DEVICE_CHANGE]: (...args: any[]) => any;
    [MediaEngineEvent.VOLUME_CHANGE]: (...args: any[]) => any;
    [MediaEngineEvent.DESKTOP_SOURCE_END]: (...args: any[]) => any;
    [MediaEngineEvent.AUDIO_PERMISSION]: (...args: any[]) => any;
    [MediaEngineEvent.VIDEO_PERMISSION]: (...args: any[]) => any;
    [MediaEngineEvent.WATCHDOG_TIMEOUT]: (...args: any[]) => any;
    [MediaEngineEvent.VIDEO_INPUT_INITIALIZED]: (...args: any[]) => any;
    [MediaEngineEvent.CONNECTION_STATS]: (...args: any[]) => any;
    [MediaEngineEvent.REMOVE_LISTENER]: (...args: any[]) => any;
};

export type MediaEngine = TypedEmitter<MediaEngineEvents> &
    MediaEngine_ & {
        Video: (...args: any[]) => any;
        Camera: (...args: any[]) => any;
        handleDeviceChange: (...args: any[]) => any;
        handleVolumeChange: (...args: any[]) => any;
        handleVoiceActivity: (...args: any[]) => any;
        handleActiveSinksChange: (...args: any[]) => any;
        handleNewListener: (...args: any[]) => any;
        handleRemoveListener: (...args: any[]) => any;
        handleVideoInputInitialization: (...args: any[]) => any;
        emitter: TypedEmitter<MediaEngineEvents>;
        videoInputDeviceId: string;
        lastVoiceActivity: number;
        audioSubsystem: string;
        audioLayer: string;
        loopback: boolean;
        deviceChangeGeneration: number;
        consecutiveWatchdogFailures: number;
        codecSurvey?: any;
        connections: Set<Connection>;
        __proto__: MediaEngine_;
    };

export interface MediaEngine_ {
    destroy: (...args: any[]) => any;
    interact: (...args: any[]) => any;
    supported: (...args: any[]) => any;
    supports: (...args: any[]) => any;
    connect: (...args: any[]) => any;
    shouldConnectionBroadcastVideo: (...args: any[]) => any;
    eachConnection: (callback: (connection: Connection) => void) => void;
    enable: (...args: any[]) => any;
    setInputVolume: (...args: any[]) => any;
    setOutputVolume: (...args: any[]) => any;
    getAudioInputDevices: (...args: any[]) => any;
    setAudioInputDevice: (...args: any[]) => any;
    getAudioOutputDevices: (...args: any[]) => any;
    setAudioOutputDevice: (...args: any[]) => any;
    getVideoInputDevices: (...args: any[]) => any;
    setVideoInputDevice: (...args: any[]) => any;
    getSupportedVideoCodecs: (...args: any[]) => any;
    getCodecCapabilities: (callback: (codecs: string) => void) => void;
    setDesktopSource: (...args: any[]) => any;
    setSoundshareSource: (...args: any[]) => any;
    getDesktopSource: (...args: any[]) => any;
    getDesktopSources: (...args: any[]) => any;
    getScreenPreviews: (...args: any[]) => any;
    setClipBufferLength: (...args: any[]) => any;
    saveClip: (...args: any[]) => any;
    updateClipMetadata: (...args: any[]) => any;
    exportClip: (...args: any[]) => any;
    getWindowPreviews: (
        width: number,
        height: number
    ) => Promise<WindowPreview[]>;
    setAudioSubsystem: (...args: any[]) => any;
    getAudioSubsystem: (...args: any[]) => any;
    getAudioLayer: (...args: any[]) => any;
    getDebugLogging: (...args: any[]) => any;
    setDebugLogging: (...args: any[]) => any;
    setExperimentalAdm: (...args: any[]) => any;
    setLoopback: (...args: any[]) => any;
    getLoopback: (...args: any[]) => any;
    setH264Enabled: (...args: any[]) => any;
    setAv1Enabled: (...args: any[]) => any;
    getCodecSurvey: () => Promise<string>;
    writeAudioDebugState: (...args: any[]) => any;
    startAecDump: (...args: any[]) => any;
    stopAecDump: (...args: any[]) => any;
    setAecDump: (...args: any[]) => any;
    rankRtcRegions: (...args: any[]) => any;
    getSoundshareStatus: (...args: any[]) => any;
    enableSoundshare: (...args: any[]) => any;
    createReplayConnection: (...args: any[]) => any;
    setUseDirectVideo: (...args: any[]) => any;
    setMaxSyncDelayOverride: (...args: any[]) => any;
    applyMediaFilterSettings: (...args: any[]) => any;
    startLocalAudioRecording: (...args: any[]) => any;
    stopLocalAudioRecording: (...args: any[]) => any;
    watchdogTick: (...args: any[]) => any;
    __proto__: TypedEmitter<MediaEngineEvents>;
}

export interface CodecCapabilities {
    codec: string;
    decode: boolean;
    encode: boolean;
}

export interface WindowPreview {
    id: string;
    url: string;
    name: string;
}
