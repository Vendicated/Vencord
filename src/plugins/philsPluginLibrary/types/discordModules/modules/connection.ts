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

import { Framerate, Resolution } from "../../../types";
import { Conn, FramerateReducer, VideoQualityManager } from "./";

export const ConnectionEvent = {
    SPEAKING: "speaking",
    MUTE: "mute",
    NEW_LISTENER: "newListener",
    DESTORY: "destroy",
    CONNECTED: "connected",
    SILENCE: "silence",
    DESKTOP_SOURCE_END: "desktopsourceend",
    SOUNDSHARE_ATTACHED: "soundshareattached",
    SOUNDSHARE_FAILED: "soundsharefailed",
    SOUNDSHARE_SPEAKING: "soundsharespeaking",
    SOUNDSHARE_TRACE: "soundsharetrace",
    INTERACTION_REQUIRED: "interactionrequired",
    VIDEOHOOK_INITIALIZED: "videohook-initialize",
    SCREENSHARE_FAILED: "screenshare-finish",
    NOISE_CANCELLER_ERROR: "noisecancellererror",
    VOICE_ACTIVITY_DETECTOR_ERROR: "voiceactivitydetectorerror",
    VIDEO_STATE: "video-state",
    VIDEO: "video",
    FIRST_FRAME: "first-frame",
    ERROR: "error",
    CONNECTION_STATE_CHANGE: "connectionstatechange",
    PING: "ping",
    PING_TIMEOUT: "pingtimeout",
    OUTBOUND_LOSSRATE: "outboundlossrate",
    LOCAL_VIDEO_DISABLED: "local-video-disabled",
    STATS: "stats",
} as const;

export type ConnectionEvent = typeof ConnectionEvent;

export type ConnectionEvents = {
    [ConnectionEvent.SPEAKING]: (...args: any[]) => any;
    [ConnectionEvent.MUTE]: (...args: any[]) => any;
    [ConnectionEvent.NEW_LISTENER]: (...args: any[]) => any;
    [ConnectionEvent.DESTORY]: (...args: any[]) => any;
    [ConnectionEvent.CONNECTED]: (...args: any[]) => any;
    [ConnectionEvent.SILENCE]: (...args: any[]) => any;
    [ConnectionEvent.DESKTOP_SOURCE_END]: (...args: any[]) => any;
    [ConnectionEvent.SOUNDSHARE_ATTACHED]: (...args: any[]) => any;
    [ConnectionEvent.SOUNDSHARE_FAILED]: (...args: any[]) => any;
    [ConnectionEvent.SOUNDSHARE_SPEAKING]: (...args: any[]) => any;
    [ConnectionEvent.SOUNDSHARE_TRACE]: (...args: any[]) => any;
    [ConnectionEvent.INTERACTION_REQUIRED]: (...args: any[]) => any;
    [ConnectionEvent.VIDEOHOOK_INITIALIZED]: (...args: any[]) => any;
    [ConnectionEvent.SCREENSHARE_FAILED]: (...args: any[]) => any;
    [ConnectionEvent.NOISE_CANCELLER_ERROR]: (...args: any[]) => any;
    [ConnectionEvent.VOICE_ACTIVITY_DETECTOR_ERROR]: (...args: any[]) => any;
    [ConnectionEvent.VIDEO_STATE]: (...args: any[]) => any;
    [ConnectionEvent.VIDEO]: (...args: any[]) => any;
    [ConnectionEvent.FIRST_FRAME]: (...args: any[]) => any;
    [ConnectionEvent.ERROR]: (...args: any[]) => any;
    [ConnectionEvent.CONNECTION_STATE_CHANGE]: (...args: any[]) => any;
    [ConnectionEvent.PING]: (...args: any[]) => any;
    [ConnectionEvent.PING_TIMEOUT]: (...args: any[]) => any;
    [ConnectionEvent.OUTBOUND_LOSSRATE]: (...args: any[]) => any;
    [ConnectionEvent.LOCAL_VIDEO_DISABLED]: (...args: any[]) => any;
    [ConnectionEvent.STATS]: (...args: any[]) => any;
};

export type Connection = TypedEmitter<ConnectionEvents> &
    Connection__ &
    Connection_ & {
        streamUserId: string,
        goLiveSourceIdentifier?: string;
        emitter: TypedEmitter<ConnectionEvents>;
        mediaEngineConnectionId: string;
        destroyed: boolean;
        audioSSRC: number;
        selfDeaf: boolean;
        localMutes: LocalMutes;
        disabledLocalVideos: LocalMutes;
        localVolumes: LocalVolumes;
        isActiveOutputSinksEnabled: boolean;
        activeOutputSinks: LocalMutes;
        videoSupported: boolean;
        useElectronVideo: boolean;
        voiceBitrate: number;
        remoteSinkWantsMaxFramerate: number;
        wantsPriority: Set<any>;
        localSpeakingFlags: LocalSpeakingFlags;
        videoReady: boolean;
        videoStreamParameters: VideoStreamParameter[];
        remoteVideoSinkWants: VideoSinkWants;
        localVideoSinkWants: VideoSinkWants;
        connectionState: string;
        experimentFlags: string[];
        context: string;
        ids: Ids;
        selfMute: boolean;
        selfVideo: boolean;
        forceAudioNormal: boolean;
        forceAudioPriority: boolean;
        codecs: Codec[];
        desktopDegradationPreference: number;
        sourceDesktopDegradationPreference: number;
        videoDegradationPreference: number;
        localPans: LocalMutes;
        remoteAudioSSRCs: LocalMutes;
        remoteVideoSSRCs: LocalMutes;
        inputMode: string;
        vadThreshold: number;
        vadAutoThreshold: boolean;
        vadUseKrisp: boolean;
        vadLeading: number;
        vadTrailing: number;
        pttReleaseDelay: number;
        soundshareActive: boolean;
        soundshareId?: any;
        soundshareSentSpeakingEvent: boolean;
        echoCancellation: boolean;
        noiseSuppression: boolean;
        automaticGainControl: boolean;
        noiseCancellation: boolean;
        experimentalEncoders: boolean;
        hardwareH264: boolean;
        attenuationFactor: number;
        attenuateWhileSpeakingSelf: boolean;
        attenuateWhileSpeakingOthers: boolean;
        qos: boolean;
        minimumJitterBufferLevel: number;
        postponeDecodeLevel: number;
        reconnectInterval: number;
        keyframeInterval: number;
        conn: Conn;
        stats: Stats;
        framerateReducer: FramerateReducer;
        videoQualityManager: VideoQualityManager;
        handleSpeakingNative: (...args: any[]) => any;
        handleSpeakingFlags: (...args: any[]) => any;
        handleSpeakingWhileMuted: (...args: any[]) => any;
        handlePing: (...args: any[]) => any;
        handlePingTimeout: (...args: any[]) => any;
        handleVideo: (...args: any[]) => any;
        handleFirstFrame: (...args: any[]) => any;
        handleNoInput: (...args: any[]) => any;
        handleDesktopSourceEnded: (...args: any[]) => any;
        handleSoundshare: (...args: any[]) => any;
        handleSoundshareFailed: (...args: any[]) => any;
        handleSoundshareEnded: (...args: any[]) => any;
        handleNewListenerNative: (...args: any[]) => any;
        handleStats: (...args: any[]) => any;
        __proto__: Connection_;
    };

interface Connection_ {
    initialize: (...args: any[]) => any;
    destroy: (...args: any[]) => any;
    setCodecs: (audioCodec: string, videoCodec: string, context: string) => any;
    getStats: (...args: any[]) => any;
    createUser: (...args: any[]) => any;
    destroyUser: (...args: any[]) => any;
    setSelfMute: (...args: any[]) => any;
    setSelfDeaf: (...args: any[]) => any;
    setSoundshareSource: (id: number, loopback: boolean) => void;
    setLocalMute: (...args: any[]) => any;
    setLocalVideoDisabled: (...args: any[]) => any;
    setMinimumJitterBufferLevel: (...args: any[]) => any;
    setPostponeDecodeLevel: (...args: any[]) => any;
    setClipRecordSsrc: (...args: any[]) => any;
    getLocalVolume: (...args: any[]) => any;
    setLocalVolume: (...args: any[]) => any;
    setLocalPan: (...args: any[]) => any;
    isAttenuating: (...args: any[]) => any;
    setAttenuation: (...args: any[]) => any;
    setCanHavePriority: (...args: any[]) => any;
    setBitRate: (...args: any[]) => any;
    setVoiceBitRate: (target: number) => void;
    setCameraBitRate: (target: number, min: number, max: number) => void;
    setEchoCancellation: (...args: any[]) => any;
    setNoiseSuppression: (...args: any[]) => any;
    setAutomaticGainControl: (...args: any[]) => any;
    setNoiseCancellation: (...args: any[]) => any;
    setExperimentalEncoders: (...args: any[]) => any;
    setHardwareH264: (...args: any[]) => any;
    setQoS: (...args: any[]) => any;
    setInputMode: (...args: any[]) => any;
    setSilenceThreshold: (...args: any[]) => any;
    setForceAudioInput: (...args: any[]) => any;
    setSpeakingFlags: (...args: any[]) => any;
    clearAllSpeaking: (...args: any[]) => any;
    setEncryption: (...args: any[]) => any;
    setReconnectInterval: (...args: any[]) => any;
    setKeyframeInterval: (keyframeInterval: number) => void;
    setVideoBroadcast: (...args: any[]) => any;
    setDesktopSource: (
        source: string | null,
        options?: DesktopSourceOptions
    ) => void;
    clearDesktopSource: (...args: any[]) => any;
    setDesktopSourceStatusCallback: (...args: any[]) => any;
    hasDesktopSource: (...args: any[]) => any;
    setDesktopEncodingOptions: (
        width: number,
        height: number,
        framerate: number
    ) => void;
    setSDP: (...args: any[]) => any;
    setRemoteVideoSinkWants: (...args: any[]) => any;
    setLocalVideoSinkWants: (...args: any[]) => any;
    startSamplesPlayback: (...args: any[]) => any;
    stopSamplesPlayback: (...args: any[]) => any;
    startSamplesLocalPlayback: (...args: any[]) => any;
    stopAllSamplesLocalPlayback: (...args: any[]) => any;
    stopSamplesLocalPlayback: (...args: any[]) => any;
    updateVideoQualityCore: (...args: any[]) => any;
    setStreamParameters: (...args: any[]) => any;
    applyVideoTransportOptions: (...args: any[]) => any;
    chooseEncryptionMode: (...args: any[]) => any;
    getUserOptions: (...args: any[]) => any;
    createInputModeOptions: (...args: any[]) => any;
    getAttenuationOptions: (...args: any[]) => any;
    getCodecParams: (...args: any[]) => any;
    getCodecOptions: (...args: any[]) => any;
    getConnectionTransportOptions: (...args: any[]) => any;
    setStream: (...args: any[]) => any;
    getUserIdBySsrc: (...args: any[]) => any;
    setRtcLogEphemeralKey: (...args: any[]) => any;
    setRtcLogMarker: (...args: any[]) => any;
    __proto__: Connection__;
}

interface Connection__ {
    destroy: (...args: any[]) => any;
    getLocalMute: (...args: any[]) => any;
    getLocalVideoDisabled: (...args: any[]) => any;
    setLocalVideoDisabled: (...args: any[]) => any;
    getHasActiveVideoOutputSink: (...args: any[]) => any;
    setHasActiveVideoOutputSink: (...args: any[]) => any;
    getActiveOutputSinkTrackingEnabled: (...args: any[]) => any;
    setUseElectronVideo: (...args: any[]) => any;
    setClipRecordSsrc: (...args: any[]) => any;
    getStreamParameters: (...args: any[]) => any;
    setExperimentFlag: (...args: any[]) => any;
    setConnectionState: (...args: any[]) => any;
    updateVideoQuality: (...args: any[]) => any;
    applyVideoQualityMode: (...args: any[]) => any;
    overwriteQualityForTesting: (args: {
        encode: Resolution & Framerate;
        capture: Resolution & Framerate;
        bitrateMin: number;
        bitrateMax: number;
        bitrateTarget: number;
    }) => any;
    applyQualityConstraints: (...args: any[]) => any;
    pickProperties: (...args: any[]) => any;
    initializeStreamParameters: (...args: any[]) => any;
    getLocalWant: (...args: any[]) => any;
    emitStats: (...args: any[]) => any;
    __proto__: TypedEmitter<ConnectionEvents>;
}

export interface Stats {
    mediaEngineConnectionId: string;
    transport: Transport;
    camera?: any;
    rtp: Rtp;
}

export interface Rtp {
    inbound: LocalMutes;
    outbound: Outbound[];
}

export interface Outbound {
    type: string;
    ssrc: number;
    sinkWant: string;
    codec: OutboundCodec;
    bytesSent: number;
    packetsSent: number;
    packetsLost: number;
    fractionLost: number;
    audioLevel: number;
    audioDetected: number;
    framesCaptured: number;
    framesRendered: number;
    noiseCancellerProcessTime: number;
}

export interface OutboundCodec {
    id: number;
    name: string;
}

export interface Transport {
    availableOutgoingBitrate: number;
    ping: number;
    decryptionFailures: number;
    routingFailures: number;
    localAddress: string;
    pacerDelay: number;
    receiverReports: any[];
    receiverBitrateEstimate: number;
    outboundBitrateEstimate: number;
    inboundBitrateEstimate: number;
    bytesSent: number;
}

export interface Codec {
    type: string;
    name: string;
    priority: number;
    payloadType: number;
    rtxPayloadType?: number;
    encode?: boolean;
    decode?: boolean;
}

export interface Ids {
    userId: string;
    channelId: string;
    guildId: string;
}

export interface VideoSinkWants {
    any: number;
}

export interface VideoStreamParameter {
    type: string;
    active: boolean;
    rid: string;
    ssrc: number;
    rtxSsrc: number;
    quality: number;
    maxBitrate: number;
    maxFrameRate: number;
    maxResolution: MaxResolution;
    maxPixelCount: number;
}

export type MaxResolution = Partial<Resolution> & {
    type: "fixed" | "source";
};

export interface LocalSpeakingFlags {
    [key: string]: number;
}

export interface LocalVolumes {
    [key: string]: number;
}

export interface LocalMutes {
    [key: string]: any;
}

export const HdrCaptureMode = {
    NEVER: "never",
    ALWAYS: "always",
    PERMITTED_DEVICES_ONLY: "permittedDevicesOnly",
} as const;

export type HdrCaptureMode = typeof HdrCaptureMode;

export interface DesktopSourceOptions extends Partial<Resolution> {
    fps?: number;
    useVideoHook?: boolean;
    useGraphicsCapture?: boolean;
    useQuartzCapturer?: boolean;
    allowScreenCaptureKit?: boolean;
    hdrCaptureMode?: HdrCaptureMode[keyof HdrCaptureMode];
}
