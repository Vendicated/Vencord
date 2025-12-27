import { FluxStore } from "..";

/** Context for media engine settings. */
export type MediaEngineContextType = "default" | "stream";

/** Audio/video device type identifiers. */
export type DeviceType = "audioinput" | "audiooutput" | "videoinput";

/** Voice activation mode for microphone input. */
export type VoiceMode = "PUSH_TO_TALK" | "VOICE_ACTIVITY";

/** WebRTC connection state. */
export type ConnectionState =
    | "DISCONNECTED"
    | "CONNECTING"
    | "CONNECTED"
    | "NO_ROUTE"
    | "ICE_CHECKING"
    | "DTLS_CONNECTING";

/** Video toggle state indicating why video was enabled/disabled. */
export type VideoToggleState =
    | "NONE"
    | "video_manual_disable"
    | "video_manual_enable"
    | "video_manual_reenable"
    | "video_auto_disable"
    | "video_auto_enable"
    | "video_auto_downgrade"
    | "video_auto_upgrade";

/** Quality override for video streams. */
export type VideoQualityOverride = "no_override" | "high" | "low";

/** Audio processing subsystem. */
export type AudioSubsystem = "legacy" | "standard" | "experimental" | "automatic";

/** Media stream types. */
export type MediaType = "audio" | "video" | "screen" | "test";

/** Keyframe interval calculation mode. */
export type KeyframeIntervalMode = "fixed" | "source";

/** Bandwidth estimation algorithm type. */
export type BandwidthEstimationType = "remb";

/** Media engine implementation type. */
export type MediaEngineType = "NATIVE" | "WEBRTC" | "DUMMY";

/** Desktop capture source types. */
export type DesktopSourceType = "WINDOW" | "SCREEN";

/** HDR capture mode for screen sharing. */
export type HdrCaptureMode = "never" | "always" | "auto";

/** Input profile type for voice settings. */
export type InputProfile = "DEFAULT" | "CUSTOM";

/** Media engine feature flags for capability checking. */
export type MediaEngineFeature =
    | "AUTO_ENABLE"
    | "ATTENUATION"
    | "AUDIO_INPUT_DEVICE"
    | "AUDIO_OUTPUT_DEVICE"
    | "VOICE_PROCESSING"
    | "QOS"
    | "NATIVE_PING"
    | "LEGACY_AUDIO_SUBSYSTEM"
    | "EXPERIMENTAL_AUDIO_SUBSYSTEM"
    | "AUTOMATIC_AUDIO_SUBSYSTEM"
    | "AUDIO_SUBSYSTEM_DEFERRED_SWITCH"
    | "AUDIO_BYPASS_SYSTEM_INPUT_PROCESSING"
    | "DEBUG_LOGGING"
    | "AUTOMATIC_VAD"
    | "VOICE_PANNING"
    | "DIAGNOSTICS"
    | "VIDEO"
    | "DESKTOP_CAPTURE"
    | "DESKTOP_CAPTURE_FORMAT"
    | "DESKTOP_CAPTURE_APPLICATIONS"
    | "SOUNDSHARE"
    | "LOOPBACK"
    | "VIDEO_HOOK"
    | "EXPERIMENTAL_SOUNDSHARE"
    | "WUMPUS_VIDEO"
    | "ELEVATED_HOOK"
    | "HYBRID_VIDEO"
    | "REMOTE_LOCUS_NETWORK_CONTROL"
    | "SCREEN_PREVIEWS"
    | "WINDOW_PREVIEWS"
    | "AUDIO_DEBUG_STATE"
    | "AEC_DUMP"
    | "DISABLE_VIDEO"
    | "CONNECTION_REPLAY"
    | "SIMULCAST"
    | "RTC_REGION_RANKING"
    | "ELECTRON_VIDEO"
    | "MEDIAPIPE"
    | "FIXED_KEYFRAME_INTERVAL"
    | "SAMPLE_PLAYBACK"
    | "FIRST_FRAME_CALLBACK"
    | "REMOTE_USER_MULTI_STREAM"
    | "NOISE_SUPPRESSION"
    | "NOISE_CANCELLATION"
    | "VOICE_FILTERS"
    | "AUTOMATIC_GAIN_CONTROL"
    | "CLIPS"
    | "SPEED_TEST"
    | "IMAGE_QUALITY_MEASUREMENT"
    | "GO_LIVE_HARDWARE"
    | "SCREEN_CAPTURE_KIT"
    | "SCREEN_SOUNDSHARE"
    | "NATIVE_SCREENSHARE_PICKER"
    | "MLS_PAIRWISE_FINGERPRINTS"
    | "OFFLOAD_ADM_CONTROLS"
    | "SIDECHAIN_COMPRESSION"
    | "VAAPI"
    | "GAMESCOPE_CAPTURE"
    | "ASYNC_VIDEO_INPUT_DEVICE_INIT"
    | "ASYNC_CLIPS_SOURCE_DEINIT"
    | "PORT_AWARE_LATENCY_TESTING";

/** Events emitted by the media engine. */
export type MediaEngineEvent =
    | "Destroy"
    | "Silence"
    | "Connection"
    | "DeviceChange"
    | "VolumeChange"
    | "VoiceActivity"
    | "WatchdogTimeout"
    | "AudioPermission"
    | "VideoPermission"
    | "DesktopSourceEnd"
    | "ConnectionStats"
    | "VideoInputInitialized"
    | "AudioInputInitialized"
    | "ClipsRecordingRestartNeeded"
    | "ClipsInitFailure"
    | "ClipsRecordingEnded"
    | "NativeScreenSharePickerUpdate"
    | "NativeScreenSharePickerCancel"
    | "NativeScreenSharePickerError"
    | "AudioDeviceModuleError"
    | "VoiceFiltersFailed"
    | "VideoCodecError"
    | "VoiceQueueMetrics"
    | "SystemMicrophoneModeChange"
    | "SelectedDeviceChange";

/**
 * Audio input or output device.
 */
export interface AudioDevice {
    /** unique device identifier from the system. */
    id: string;
    /** device index in enumeration, -1 for default device. */
    index: number;
    /** human readable device name. */
    name: string;
    /** whether the device is disabled in system settings. */
    disabled: boolean;
    /** camera facing direction if applicable, undefined for audio devices. */
    facing?: string;
    /** windows device GUID for identification. */
    guid: string;
    /** hardware identifier for the device. */
    hardwareId: string;
    /** container identifier grouping related devices. */
    containerId: string;
    /** audio effects supported by device, undefined if none. */
    effects?: string[];
}

/**
 * Video input device (webcam).
 */
export interface VideoDevice {
    /** unique device identifier from the system. */
    id: string;
    /** device index in enumeration. */
    index: number;
    /** human readable device name. */
    name: string;
    /** whether the device is disabled in system settings. */
    disabled: boolean;
    /** camera facing direction, "front", "back", or "unknown". */
    facing?: string;
    /** windows device GUID for identification. */
    guid: string;
    /** hardware identifier for the device. */
    hardwareId?: string;
    /** container identifier grouping related devices. */
    containerId?: string;
    /** video effects supported by device, undefined if none. */
    effects?: string[];
}

/**
 * Quality settings for clips recording.
 */
export interface ClipsQuality {
    /** recording frame rate in fps. */
    frameRate: number;
    /** recording resolution height in pixels. */
    resolution: number;
}

/**
 * Desktop capture configuration for clips.
 */
export interface DesktopDescription {
    /** desktop source identifier. */
    id: string;
    /** soundshare source identifier for audio capture. */
    soundshareId: number;
    /** whether to use loopback audio capture. */
    useLoopback: boolean;
    /** whether to use video hook for capture. */
    useVideoHook: boolean;
    /** whether to use windows graphics capture API. */
    useGraphicsCapture: boolean;
    /** whether to use macOS quartz capturer. */
    useQuartzCapturer: boolean;
    /** whether to allow macOS screencapturekit. */
    allowScreenCaptureKit: boolean;
    /** HDR capture behavior. */
    hdrCaptureMode: HdrCaptureMode;
}

/**
 * Source configuration for clips recording.
 */
export interface ClipsSource {
    /** quality settings for the recording. */
    quality: ClipsQuality;
    /** desktop capture configuration. */
    desktopDescription: DesktopDescription;
}

/**
 * Desktop source for screen sharing.
 */
export interface DesktopSource {
    /** source identifier string. */
    id: string;
    /** process id of the source application, null if not applicable. */
    sourcePid: number | null;
    /** soundshare identifier for audio capture, null if not capturing audio. */
    soundshareId: string | null;
    /** soundshare session identifier, null if not active. */
    soundshareSession: string | null;
}

/**
 * Quality settings for go live streaming.
 */
export interface GoLiveQuality {
    /** stream resolution height in pixels. */
    resolution: number;
    /** stream frame rate in fps. */
    frameRate: number;
}

/**
 * Source configuration for go live streaming.
 */
export interface GoLiveSource {
    /** desktop source being streamed. */
    desktopSource: DesktopSource;
    /** quality settings for the stream. */
    quality: GoLiveQuality;
}

/**
 * Video stream parameter for simulcast layers.
 */
export interface VideoStreamParameter {
    /** simulcast layer id, e.g. "100" for full quality, "50" for half. */
    rid: string;
    /** type of media stream. */
    type: MediaType;
    /** quality percentage 0-100. */
    quality: number;
}

/**
 * Stereo panning for a user's audio.
 */
export interface LocalPan {
    /** left channel volume multiplier 0-1, default 1. */
    left: number;
    /** right channel volume multiplier 0-1, default 1. */
    right: number;
}

/**
 * Voice activity detection and push-to-talk options.
 */
export interface ModeOptions {
    /** VAD threshold in dB, default -60. */
    threshold: number;
    /** whether to auto-adjust threshold based on noise floor, default true. */
    autoThreshold: boolean;
    /** whether to use krisp for VAD instead of webrtc, default true. */
    vadUseKrisp: boolean;
    /** krisp activation threshold 0-1, default 0.8. */
    vadKrispActivationThreshold: number;
    /** frames of audio to keep before speech is detected, default 5. */
    vadLeading: number;
    /** frames to keep transmitting after speech ends, default 25. */
    vadTrailing: number;
    /** PTT release delay in milliseconds, default 20. */
    delay: number;
    /** keyboard shortcut keys for PTT, default empty array. */
    shortcut: string[];
    /** whether to run VAD before audio processing, default false. */
    vadDuringPreProcess?: boolean;
}

/**
 * Options for audio loopback testing.
 */
export interface LoopbackOptions {
    /** whether echo cancellation is enabled. */
    echoCancellation: boolean;
    /** whether noise suppression is enabled. */
    noiseSuppression: boolean;
    /** whether automatic gain control is enabled. */
    automaticGainControl: boolean;
    /** whether krisp noise cancellation is enabled. */
    noiseCancellation: boolean;
}

/**
 * Screen capture preview thumbnail.
 */
export interface ScreenPreview {
    /** screen source identifier. */
    id: string;
    /** data URL of thumbnail image. */
    url: string;
    /** display name, e.g. "Screen 1". */
    name: string;
}

/**
 * Window capture preview thumbnail.
 */
export interface WindowPreview {
    /** window source identifier. */
    id: string;
    /** data URL of thumbnail image. */
    url: string;
    /** window title. */
    name: string;
}

/**
 * Krisp noise cancellation statistics.
 */
export interface NoiseCancellationStats {
    /** milliseconds of detected voice audio. */
    voiceMs: number;
    /** milliseconds of detected music audio. */
    musicMs: number;
    /** milliseconds of detected noise audio. */
    noiseMs: number;
}

/**
 * MLS signing key for end-to-end encryption.
 */
export interface MLSSigningKey {
    /** raw key bytes. */
    key: Uint8Array;
    /** key signature bytes. */
    signature: Uint8Array;
}

/**
 * Codec capability info for a single codec.
 */
export interface CodecInfo {
    /** codec name (H264, VP8, VP9, AV1, H265). */
    name: string;
    /** whether encoding is supported, false if no hardware/software encoder available. */
    encode: boolean;
    /** whether decoding is supported, false if no hardware/software decoder available. */
    decode: boolean;
}

/**
 * Metadata for saved clips.
 */
export interface ClipMetadata {
    /** custom name for the clip. */
    name?: string;
    /** description text for the clip. */
    description?: string;
}

/**
 * Result of saving a clip.
 */
export interface SavedClip {
    /** unique clip identifier. */
    id: string;
    /** path where clip was saved. */
    filepath: string;
}

/**
 * Result of saving a screenshot.
 */
export interface Screenshot {
    /** path where screenshot was saved. */
    filepath: string;
}

/**
 * Settings for video background filters.
 */
export interface MediaFilterSettings {
    /** whether background replacement is enabled. */
    backgroundEnabled: boolean;
    /** background blur intensity 0-100. */
    backgroundBlur: number;
    /** custom background image id, null for blur only. */
    backgroundId: string | null;
}

/**
 * Options for local audio recording.
 */
export interface AudioRecordingOptions {
    /** whether to apply echo cancellation. */
    echoCancellation: boolean;
    /** whether to apply noise suppression. */
    noiseSuppression: boolean;
}

/**
 * Options for raw audio sample recording.
 */
export interface RawSamplesOptions {
    /** number of audio channels. */
    channels: number;
    /** sample rate in hz. */
    sampleRate: number;
}

/**
 * Options for creating a voice connection.
 */
export interface ConnectionOptions {
    /** whether to start muted. */
    selfMute: boolean;
    /** whether to start deafened. */
    selfDeaf: boolean;
    /** whether to start with video enabled. */
    selfVideo: boolean;
}

/**
 * Options for creating a replay connection.
 */
export interface ReplayConnectionOptions {
    /** path to the replay file. */
    filePath: string;
}

/**
 * Info emitted when video input initializes.
 */
export interface VideoInputInitializationInfo {
    /** device that was initialized. */
    description: VideoDevice;
    /** time in seconds until first frame. */
    timeToFirstFrame: number;
    /** whether initialization timed out. */
    initializationTimerExpired: boolean;
    /** entropy value for the video feed. */
    entropy: number;
}

/**
 * Info emitted when audio input initializes.
 */
export interface AudioInputInitializationInfo {
    /** device that was initialized. */
    description: AudioDevice;
    /** time in seconds until initialized. */
    timeToInitialized: number;
}

/**
 * Video codec error details.
 */
export interface VideoCodecErrorInfo {
    /** whether error occurred during encode or decode. */
    mode: "encode" | "decode";
    /** codec standard name. */
    codecStandard: string;
    /** error message text. */
    message: string;
    /** implementation name that failed. */
    implName: string;
}

/**
 * Codec information for connection setup.
 */
export interface ConnectionCodec {
    /** codec name. */
    name: string;
    /** payload type number. */
    payloadType: number;
    /** priority order. */
    priority: number;
    /** rtx payload type if applicable. */
    rtxPayloadType?: number;
}

/**
 * Connection transport initialization options.
 */
export interface ConnectionTransportOptions {
    /** server address. */
    address: string;
    /** server port. */
    port: number;
    /** audio ssrc. */
    ssrc: number;
    /** available encryption modes. */
    modes: string[];
    /** stream count. */
    streamCount?: number;
    /** audio codecs. */
    audioCodec?: ConnectionCodec;
    /** video codecs. */
    videoCodec?: ConnectionCodec;
    /** rtx codecs. */
    rtxCodec?: ConnectionCodec;
    /** experiment flags. */
    experiments?: string[];
}

/**
 * Input mode options for voice activity or push-to-talk.
 */
export interface InputModeOptions {
    /** VAD threshold in dB. */
    vadThreshold?: number;
    /** whether to auto-adjust threshold. */
    vadAutoThreshold?: boolean;
    /** whether to use krisp for VAD. */
    vadUseKrisp?: boolean;
    /** krisp activation threshold. */
    vadKrispActivationThreshold?: number;
    /** frames before speech detection. */
    vadLeading?: number;
    /** frames after speech ends. */
    vadTrailing?: number;
    /** PTT release delay in ms. */
    pttReleaseDelay?: number;
}

/**
 * Go live source configuration for streaming.
 */
export interface GoLiveSourceOptions {
    /** quality settings. */
    quality: GoLiveQuality;
    /** desktop description if streaming desktop. */
    desktopDescription?: DesktopDescription;
    /** camera description if streaming camera. */
    cameraDescription?: { deviceId: string; };
}

/**
 * Video stream parameter for simulcast configuration.
 */
export interface StreamParameter {
    /** simulcast rid. */
    rid: string;
    /** max bitrate. */
    maxBitrate?: number;
    /** max framerate. */
    maxFrameRate?: number;
    /** max resolution. */
    maxResolution?: { width: number; height: number; };
    /** quality percentage. */
    quality?: number;
}

/**
 * Automatic gain control configuration.
 */
export interface AutomaticGainControlConfig {
    /** whether AGC is enabled, default true. */
    enabled: boolean;
    /** whether to use AGC2 algorithm, default true. */
    useAGC2: boolean;
    /** whether analog gain control is enabled, default false. */
    enableAnalog: boolean;
    /** whether digital gain control is enabled, default true. */
    enableDigital: boolean;
    /** headroom in decibels, default 5. */
    headroom_db: number;
    /** maximum gain in decibels, default 50. */
    max_gain_db: number;
    /** initial gain in decibels, default 15. */
    initial_gain_db: number;
    /** max gain change per second in decibels, default 6. */
    max_gain_change_db_per_second: number;
    /** max output noise level in dbfs, default -50. */
    max_output_noise_level_dbfs: number;
    /** fixed gain in decibels, default 0. */
    fixed_gain_db: number;
}

/**
 * Active voice/video connection to a channel.
 */
export interface MediaEngineConnection {
    /** context this connection belongs to. */
    context: MediaEngineContextType;
    /** unique identifier for this connection. */
    mediaEngineConnectionId: string;
    /** user id who owns this connection. */
    userId: string;
    /** user id for stream context, undefined in default context. */
    streamUserId: string | undefined;
    /** current connection state. */
    connectionState: ConnectionState;
    /** whether self is muted. */
    selfMute: boolean;
    /** whether self is deafened. */
    selfDeaf: boolean;
    /** whether self video is enabled. */
    selfVideo: boolean;
    /** whether this connection has been destroyed. */
    destroyed: boolean;
    /** audio ssrc for this connection. */
    audioSSRC: number;
    /** video ssrc for this connection. */
    videoSSRC: number;
    /** local mute states keyed by user id. */
    localMutes: { [userId: string]: boolean; };
    /** local volume levels keyed by user id. */
    localVolumes: { [userId: string]: number; };
    /** local pan settings keyed by user id. */
    localPans: { [userId: string]: LocalPan; };
    /** disabled local video states keyed by user id. */
    disabledLocalVideos: { [userId: string]: boolean; };
    /** current voice bitrate in bps, default 64000. */
    voiceBitrate: number;
    /** whether video is supported. */
    videoSupported: boolean;
    /** video stream parameters. */
    videoStreamParameters: StreamParameter[];
    /** soundshare source id. */
    soundshareId: number | null;
    /** whether soundshare is active. */
    soundshareActive: boolean;
    /** whether echo cancellation is enabled. */
    echoCancellation: boolean;
    /** whether noise suppression is enabled. */
    noiseSuppression: boolean;
    /** automatic gain control configuration. */
    automaticGainControl: AutomaticGainControlConfig;
    /** whether noise cancellation is enabled. */
    noiseCancellation: boolean;
    /** whether QoS is enabled. */
    qos: boolean;
    /** current input mode. */
    inputMode: string;
    /** VAD threshold in dB, default -60. */
    vadThreshold: number;
    /** whether VAD auto threshold is enabled, default true. */
    vadAutoThreshold: boolean;
    /** PTT release delay in ms, default 20. */
    pttReleaseDelay: number;
    /** keyframe interval in ms, default 0. */
    keyframeInterval: number;
    /** attenuation factor 0-1, default 1 (no attenuation). */
    attenuationFactor: number;
    /** whether to attenuate while self speaking. */
    attenuateWhileSpeakingSelf: boolean;
    /** whether to attenuate while others speaking. */
    attenuateWhileSpeakingOthers: boolean;

    /**
     * Initializes the connection with transport options.
     * @param options transport options.
     */
    initialize(options: ConnectionTransportOptions): void;
    /** destroys this connection and cleans up resources. */
    destroy(): void;
    /**
     * Sets codecs for the connection.
     * @param audioCodec audio codec name.
     * @param videoCodec video codec name.
     * @param rtxCodec rtx codec name.
     */
    setCodecs(audioCodec: string, videoCodec: string, rtxCodec: string): void;
    /**
     * Gets connection statistics.
     * @returns promise resolving to stats or null.
     */
    getStats(): Promise<object | null>;
    /**
     * Creates a remote user in the connection.
     * @param userId user id.
     * @param audioSSRC audio ssrc.
     * @param videoSSRC video ssrc.
     */
    createUser(userId: string, audioSSRC: number, videoSSRC: number): void;
    /**
     * Destroys a remote user from the connection.
     * @param userId user id.
     */
    destroyUser(userId: string): void;
    /**
     * Sets self mute state.
     * @param mute whether to mute.
     */
    setSelfMute(mute: boolean): void;
    /**
     * Gets self mute state.
     * @returns true if muted.
     */
    getSelfMute(): boolean;
    /**
     * Gets self deaf state.
     * @returns true if deafened.
     */
    getSelfDeaf(): boolean;
    /**
     * Sets self deaf state.
     * @param deaf whether to deafen.
     */
    setSelfDeaf(deaf: boolean): void;
    /**
     * Sets soundshare source for this connection.
     * @param soundshareId soundshare source id.
     * @param active whether to enable.
     */
    setSoundshareSource(soundshareId: number, active: boolean): void;
    /**
     * Sets local mute for a user.
     * @param userId user to mute.
     * @param muted whether to mute.
     */
    setLocalMute(userId: string, muted: boolean): void;
    /** performs a fast UDP reconnect. */
    fastUdpReconnect(): void;
    /**
     * Gets number of fast UDP reconnects.
     * @returns reconnect count or null if unsupported.
     */
    getNumFastUdpReconnects(): number | null;
    /** checks if remote was disconnected. */
    wasRemoteDisconnected(): void;
    /**
     * Disables receiving video from a user.
     * @param userId user to disable video for.
     * @param disabled whether to disable.
     */
    setLocalVideoDisabled(userId: string, disabled: boolean): void;
    /**
     * Sets minimum jitter buffer level.
     * @param level jitter buffer level.
     */
    setMinimumJitterBufferLevel(level: number): void;
    /**
     * Sets postpone decode level.
     * @param level decode level.
     */
    setPostponeDecodeLevel(level: number): void;
    /**
     * Sets clip recording for a user.
     * @param userId user id.
     * @param type clip type.
     * @param enabled whether enabled.
     */
    setClipRecordUser(userId: string, type: string, enabled: boolean): void;
    /**
     * Sets clips keyframe interval.
     * @param interval interval in ms.
     */
    setClipsKeyFrameInterval(interval: number): void;
    /**
     * Sets viewer side clip.
     * @param enabled whether enabled.
     */
    setViewerSideClip(enabled: boolean): void;
    /**
     * Sets remote audio history duration.
     * @param durationMs duration in ms.
     */
    setRemoteAudioHistory(durationMs: number): void;
    /**
     * Sets quality decoupling.
     * @param enabled whether enabled.
     */
    setQualityDecoupling(enabled: boolean): void;
    /**
     * Gets local volume for a user.
     * @param userId user id.
     * @returns volume level.
     */
    getLocalVolume(userId: string): number;
    /**
     * Sets local volume for a user.
     * @param userId user to adjust.
     * @param volume volume level 0-200, 100 is normal.
     */
    setLocalVolume(userId: string, volume: number): void;
    /**
     * Sets stereo pan for a user.
     * @param userId user to adjust.
     * @param left left channel 0-1.
     * @param right right channel 0-1.
     */
    setLocalPan(userId: string, left: number, right: number): void;
    /**
     * Checks if currently attenuating.
     * @returns true if attenuating.
     */
    isAttenuating(): boolean;
    /**
     * Sets attenuation settings.
     * @param factor attenuation factor 0-100.
     * @param whileSpeakingSelf attenuate while self speaking.
     * @param whileSpeakingOthers attenuate while others speaking.
     */
    setAttenuation(factor: number, whileSpeakingSelf: boolean, whileSpeakingOthers: boolean): void;
    /**
     * Sets whether user can have priority speaker.
     * @param userId user id.
     * @param canHavePriority whether can have priority.
     */
    setCanHavePriority(userId: string, canHavePriority: boolean): void;
    /**
     * Sets voice bitrate.
     * @param bitrate bitrate in bps.
     */
    setBitRate(bitrate: number): void;
    /**
     * Sets voice bitrate.
     * @param bitrate bitrate in bps.
     */
    setVoiceBitRate(bitrate: number): void;
    /**
     * Sets camera bitrate.
     * @param maxBitrate max bitrate.
     * @param minBitrate min bitrate.
     * @param targetBitrate target bitrate.
     */
    setCameraBitRate(maxBitrate: number, minBitrate: number | null, targetBitrate: number | null): void;
    /**
     * Sets echo cancellation.
     * @param enabled whether enabled.
     */
    setEchoCancellation(enabled: boolean): void;
    /**
     * Sets noise suppression.
     * @param enabled whether enabled.
     */
    setNoiseSuppression(enabled: boolean): void;
    /**
     * Sets automatic gain control.
     * @param config AGC configuration.
     */
    setAutomaticGainControl(config: AutomaticGainControlConfig): void;
    /**
     * Sets noise cancellation.
     * @param enabled whether enabled.
     */
    setNoiseCancellation(enabled: boolean): void;
    /**
     * Sets noise cancellation during processing.
     * @param enabled whether enabled.
     */
    setNoiseCancellationDuringProcessing(enabled: boolean): void;
    /**
     * Sets noise cancellation after processing.
     * @param enabled whether enabled.
     */
    setNoiseCancellationAfterProcessing(enabled: boolean): void;
    /**
     * Sets VAD after WebRTC.
     * @param enabled whether enabled.
     */
    setVADAfterWebrtc(enabled: boolean): void;
    /**
     * Gets noise cancellation state.
     * @returns true if enabled.
     */
    getNoiseCancellation(): boolean;
    /**
     * Gets current voice filter id.
     * @returns voice filter id or null.
     */
    getVoiceFilterId(): string | null;
    /**
     * Sets voice filter id.
     * @param filterId filter id or null.
     */
    setVoiceFilterId(filterId: string | null): void;
    /**
     * Sets QoS enabled.
     * @param enabled whether enabled.
     */
    setQoS(enabled: boolean): void;
    /**
     * Sets soundshare discard rear channels.
     * @param discard whether to discard.
     */
    setSoundshareDiscardRearChannels(discard: boolean): void;
    /**
     * Sets input mode.
     * @param mode input mode.
     * @param options mode options.
     */
    setInputMode(mode: string, options: InputModeOptions): void;
    /**
     * Sets silence threshold.
     * @param threshold threshold value.
     */
    setSilenceThreshold(threshold: number): void;
    /**
     * Sets force audio input.
     * @param force whether to force.
     * @param playTone whether to play tone.
     * @param isSpeaking whether speaking.
     */
    setForceAudioInput(force: boolean, playTone?: boolean, isSpeaking?: boolean): void;
    /**
     * Sets speaking flags for a user.
     * @param userId user id.
     * @param flags speaking flags.
     */
    setSpeakingFlags(userId: string, flags: number): void;
    /** clears all speaking states. */
    clearAllSpeaking(): void;
    /**
     * Sets encryption mode.
     * @param mode encryption mode.
     * @param secretKey secret key.
     */
    setEncryption(mode: string, secretKey: Uint8Array): void;
    /**
     * Sets reconnect interval.
     * @param interval interval in ms.
     */
    setReconnectInterval(interval: number): void;
    /**
     * Sets keyframe interval.
     * @param interval interval in ms.
     */
    setKeyframeInterval(interval: number): void;
    /**
     * Sets video quality measurement.
     * @param enabled whether enabled.
     */
    setVideoQualityMeasurement(enabled: boolean): void;
    /**
     * Sets video encoder experiments.
     * @param experiments experiment config.
     */
    setVideoEncoderExperiments(experiments: object): void;
    /**
     * Sets video broadcast state.
     * @param broadcast whether broadcasting.
     */
    setVideoBroadcast(broadcast: boolean): void;
    /**
     * Sets go live source.
     * @param source source options.
     */
    setGoLiveSource(source: GoLiveSourceOptions): void;
    /** clears go live devices. */
    clearGoLiveDevices(): void;
    /** clears the desktop source from this connection. */
    clearDesktopSource(): void;
    /**
     * Sets desktop source status callback.
     * @param callback callback function.
     */
    setDesktopSourceStatusCallback(callback: (status: string) => void): void;
    /**
     * Checks if connection has a desktop source.
     * @returns true if streaming desktop.
     */
    hasDesktopSource(): boolean;
    /**
     * Sets desktop encoding options.
     * @param width width.
     * @param height height.
     * @param framerate framerate.
     */
    setDesktopEncodingOptions(width: number, height: number, framerate: number): void;
    /**
     * Sets SDP.
     * @param sdp SDP string.
     */
    setSDP(sdp: string): void;
    /**
     * Sets remote video sink wants.
     * @param wants sink wants config.
     */
    setRemoteVideoSinkWants(wants: object): void;
    /**
     * Sets local video sink wants.
     * @param wants sink wants config.
     */
    setLocalVideoSinkWants(wants: object): void;
    /**
     * Starts samples local playback.
     * @param id playback id.
     * @param buffer audio buffer.
     * @param options playback options.
     * @param callback completion callback.
     */
    startSamplesLocalPlayback(id: string, buffer: AudioBuffer, options: object, callback: (error: number, message: string) => void): void;
    /** stops all samples local playback. */
    stopAllSamplesLocalPlayback(): void;
    /**
     * Stops samples local playback.
     * @param id playback id.
     */
    stopSamplesLocalPlayback(id: string): void;
    /**
     * Sets bandwidth estimation experiments.
     * @param experiments experiment config.
     */
    setBandwidthEstimationExperiments(experiments: object): void;
    /**
     * Updates video quality core.
     * @param options quality options.
     * @param reason update reason.
     */
    updateVideoQualityCore(options: object, reason: string): void;
    /**
     * Sets stream parameters.
     * @param params stream parameters.
     * @returns promise.
     */
    setStreamParameters(params: StreamParameter[]): Promise<void>;
    /** applies video transport options. */
    applyVideoTransportOptions(): void;
    /**
     * Chooses encryption mode.
     * @param preferred preferred modes.
     * @param available available modes.
     * @returns chosen mode.
     */
    chooseEncryptionMode(preferred: string[], available: string[]): string;
    /**
     * Gets user options.
     * @returns user options array.
     */
    getUserOptions(): object[];
    /**
     * Creates input mode options.
     * @returns input mode options.
     */
    createInputModeOptions(): InputModeOptions;
    /**
     * Gets attenuation options.
     * @returns attenuation options.
     */
    getAttenuationOptions(): object;
    /**
     * Gets codec params.
     * @param codec codec name.
     * @param isHardware whether hardware codec.
     * @returns codec params.
     */
    getCodecParams(codec: string, isHardware: boolean): object;
    /**
     * Gets codec options.
     * @param audioCodec audio codec.
     * @param videoCodec video codec.
     * @param rtxCodec rtx codec.
     * @returns codec options.
     */
    getCodecOptions(audioCodec: string, videoCodec: string, rtxCodec: string): object;
    /**
     * Gets keyframe interval.
     * @returns interval in ms.
     */
    getKeyFrameInterval(): number;
    /**
     * Gets connection transport options.
     * @returns transport options.
     */
    getConnectionTransportOptions(): object;
    /**
     * Sets stream (not implemented).
     * @param stream media stream.
     */
    setStream(stream: MediaStream): void;
    /**
     * Gets user id by ssrc.
     * @param ssrc ssrc value.
     */
    getUserIdBySsrc(ssrc: number): void;
    /**
     * Prepares secure frames transition.
     * @param transitionId transition id.
     * @param epoch epoch number.
     * @param callback callback function.
     */
    prepareSecureFramesTransition(transitionId: number, epoch: number, callback: () => void): void;
    /**
     * Prepares secure frames epoch.
     * @param epoch epoch number.
     * @param data epoch data.
     * @param callback callback function.
     */
    prepareSecureFramesEpoch(epoch: number, data: Uint8Array, callback: () => void): void;
    /**
     * Executes secure frames transition.
     * @param transitionId transition id.
     */
    executeSecureFramesTransition(transitionId: number): void;
    /**
     * Gets MLS key package.
     * @param callback callback receiving key package.
     */
    getMLSKeyPackage(callback: (keyPackage: Uint8Array) => void): void;
    /**
     * Updates MLS external sender.
     * @param sender external sender data.
     */
    updateMLSExternalSender(sender: Uint8Array): void;
    /**
     * Processes MLS proposals.
     * @param proposals proposals data.
     * @param callback callback function.
     */
    processMLSProposals(proposals: Uint8Array, callback: () => void): void;
    /**
     * Prepares MLS commit transition.
     * @param transitionId transition id.
     * @param commit commit data.
     * @param callback callback function.
     */
    prepareMLSCommitTransition(transitionId: number, commit: Uint8Array, callback: () => void): void;
    /**
     * Processes MLS welcome.
     * @param transitionId transition id.
     * @param welcome welcome data.
     * @param callback callback function.
     */
    processMLSWelcome(transitionId: number, welcome: Uint8Array, callback: () => void): void;
    /**
     * Gets MLS pairwise fingerprint.
     * @param userId user id.
     * @param version version.
     * @param callback callback receiving fingerprint.
     */
    getMLSPairwiseFingerprint(userId: string, version: number, callback: (fingerprint: Uint8Array) => void): void;
    /**
     * Presents desktop source picker.
     * @param options picker options.
     */
    presentDesktopSourcePicker(options: object): void;
    /**
     * Merges users.
     * @param users user merge data.
     */
    mergeUsers(users: object[]): void;
    /**
     * Gets whether there is an active video output sink.
     * @param userId user id.
     * @returns true if has active sink.
     */
    getHasActiveVideoOutputSink(userId: string): boolean;
    /**
     * Sets whether there is an active video output sink.
     * @param userId user id.
     * @param hasActiveSink whether sink is active.
     * @param reason reason for the change.
     */
    setHasActiveVideoOutputSink(userId: string, hasActiveSink: boolean, reason: string): void;
    /**
     * Applies quality constraints to video.
     * @param constraints quality constraints object.
     * @param ssrc optional ssrc to apply to.
     * @returns quality manager result.
     */
    applyQualityConstraints(constraints?: object, ssrc?: number): object;
    /**
     * Applies video quality mode preset.
     * @param mode quality mode to apply.
     */
    applyVideoQualityMode(mode: number): void;
    /**
     * Configures go live simulcast settings.
     * @param enabled whether simulcast is enabled.
     * @param options simulcast options.
     */
    configureGoLiveSimulcast(enabled: boolean, options: object): void;
    /**
     * Emits connection stats.
     * @returns promise resolving to stats or null.
     */
    emitStats(): Promise<object | null>;
    /**
     * Gets whether active output sink tracking is enabled.
     * @returns true if enabled.
     */
    getActiveOutputSinkTrackingEnabled(): boolean;
    /**
     * Gets local mute state for a user.
     * @param userId user id.
     * @returns true if muted.
     */
    getLocalMute(userId: string): boolean;
    /**
     * Gets local video disabled state for a user.
     * @param userId user id.
     * @returns true if disabled.
     */
    getLocalVideoDisabled(userId: string): boolean;
    /**
     * Gets local video quality want for a ssrc.
     * @param ssrc optional ssrc.
     * @returns quality want object.
     */
    getLocalWant(ssrc?: number): object;
    /**
     * Gets remote video sink pixel count for a user.
     * @param userId user id.
     * @returns pixel count.
     */
    getRemoteVideoSinkPixelCount(userId: string): number;
    /**
     * Gets remote video sink wants for a user.
     * @param userId user id.
     * @returns sink wants object.
     */
    getRemoteVideoSinkWants(userId: string): object;
    /**
     * Gets current stream parameters.
     * @returns array of stream parameters.
     */
    getStreamParameters(): StreamParameter[];
    /**
     * Handles desktop source ended event.
     * @param reason end reason.
     * @param errorCode error code.
     */
    handleDesktopSourceEnded(reason: string, errorCode: number): void;
    /**
     * Handles first frame received.
     * @param userId user id.
     * @param ssrc ssrc.
     * @param stats stats object.
     */
    handleFirstFrame(userId: string, ssrc: number, stats: object): void;
    /**
     * Handles first frame encrypted stats.
     * @param stats stats object.
     */
    handleFirstFrameEncryptedStats(stats: object): void;
    /**
     * Handles first frame stats.
     * @param stats stats object.
     */
    handleFirstFrameStats(stats: object): void;
    /**
     * Handles MLS failure.
     * @param error error string.
     * @param code error code.
     */
    handleMLSFailure(error: string, code: number): void;
    /**
     * Handles native mute changed.
     * @param muted new mute state.
     */
    handleNativeMuteChanged(muted: boolean): void;
    /**
     * Handles native mute toggled from system.
     */
    handleNativeMuteToggled(): void;
    /**
     * Handles new listener for native events.
     * @param event event name.
     */
    handleNewListenerNative(event: string): void;
    /**
     * Handles no input detected.
     * @param hasInput whether input is detected.
     */
    handleNoInput(hasInput: boolean): void;
    /**
     * Handles ping response.
     * @param latency latency in ms.
     * @param hostname hostname.
     * @param port port number.
     */
    handlePing(latency: number, hostname: string, port: number): void;
    /**
     * Handles ping timeout.
     * @param hostname hostname.
     * @param port port number.
     * @param attempts attempt count.
     * @param timeout timeout in ms.
     */
    handlePingTimeout(hostname: string, port: number, attempts: number, timeout: number): void;
    /**
     * Handles RTCP message.
     * @param type message type.
     * @param data message data.
     */
    handleRTCPMessage(type: string, data: string): void;
    /**
     * Handles soundshare attached.
     * @param attached whether attached.
     */
    handleSoundshare(attached: boolean): void;
    /**
     * Handles soundshare ended.
     */
    handleSoundshareEnded(): void;
    /**
     * Handles soundshare failed.
     * @param failureCode failure code.
     * @param failureReason failure reason.
     * @param willRetry whether it will retry.
     */
    handleSoundshareFailed(failureCode: number, failureReason: string, willRetry: boolean): void;
    /**
     * Handles speaking flags change.
     * @param userId user id.
     * @param flags speaking flags.
     * @param ssrc ssrc.
     */
    handleSpeakingFlags(userId: string, flags: number, ssrc: number): void;
    /**
     * Handles native speaking event.
     * @param userId user id.
     * @param speaking speaking state or flags.
     * @param ssrc ssrc.
     */
    handleSpeakingNative(userId: string, speaking: boolean | number, ssrc: number): void;
    /**
     * Handles speaking while muted event.
     */
    handleSpeakingWhileMuted(): void;
    /**
     * Handles stats received.
     * @param stats stats object.
     */
    handleStats(stats: object): void;
    /**
     * Handles video stream update.
     * @param userId user id.
     * @param ssrc ssrc.
     * @param active whether active.
     * @param streams stream array.
     */
    handleVideo(userId: string, ssrc: number, active: boolean, streams: object[]): void;
    /**
     * Handles video encoder fallback.
     * @param codecName codec that failed.
     */
    handleVideoEncoderFallback(codecName: string): void;
    /**
     * Initializes stream parameters.
     * @param parameters initial parameters.
     */
    initializeStreamParameters(parameters: StreamParameter[]): void;
    /**
     * Callback when desktop encoding options are set.
     * @param width width.
     * @param height height.
     * @param framerate framerate.
     */
    onDesktopEncodingOptionsSet(width: number, height: number, framerate: number): void;
    /**
     * Overwrites quality for testing.
     * @param quality quality value.
     */
    overwriteQualityForTesting(quality: number): void;
    /**
     * Sets the connection state.
     * @param state new connection state.
     */
    setConnectionState(state: ConnectionState): void;
    /**
     * Sets an experiment flag.
     * @param flag flag name.
     * @param enabled whether enabled.
     */
    setExperimentFlag(flag: string, enabled: boolean): void;
    /**
     * Sets whether to use electron video.
     * @param use whether to use.
     */
    setUseElectronVideo(use: boolean): void;
    /**
     * Updates video quality settings.
     * @param ssrc optional ssrc to update.
     */
    updateVideoQuality(ssrc?: number): void;
}

/**
 * Low-level media engine for audio/video processing.
 * Handles device enumeration, encoding/decoding, and connections.
 */
export interface MediaEngine {
    /** camera preview component. */
    Camera: React.ComponentType<{ disabled?: boolean; deviceId?: string; width?: number; height?: number; }>;
    /** video display component. */
    Video: React.ComponentType & { onContainerResized: () => void; };
    /** set of active voice/video connections. */
    connections: Set<MediaEngineConnection>;

    /**
     * Registers a listener for device changes.
     * @param event event name.
     * @param listener callback receiving device lists.
     */
    on(event: "DeviceChange", listener: (inputDevices: AudioDevice[], outputDevices: AudioDevice[], videoDevices: VideoDevice[]) => void): this;
    /**
     * Registers a listener for volume changes.
     * @param event event name.
     * @param listener callback receiving input and output volumes.
     */
    on(event: "VolumeChange", listener: (inputVolume: number, outputVolume: number) => void): this;
    /**
     * Registers a listener for voice activity.
     * @param event event name.
     * @param listener callback receiving user id and activity level.
     */
    on(event: "VoiceActivity", listener: (userId: string, voiceActivity: number) => void): this;
    /**
     * Registers a listener for desktop source end.
     * @param event event name.
     * @param listener callback receiving reason and error code.
     */
    on(event: "DesktopSourceEnd", listener: (reason: string, errorCode: number) => void): this;
    /**
     * Registers a listener for audio permission changes.
     * @param event event name.
     * @param listener callback receiving granted state.
     */
    on(event: "AudioPermission", listener: (granted: boolean) => void): this;
    /**
     * Registers a listener for video permission changes.
     * @param event event name.
     * @param listener callback receiving granted state.
     */
    on(event: "VideoPermission", listener: (granted: boolean) => void): this;
    /**
     * Registers a listener for video input initialization.
     * @param event event name.
     * @param listener callback receiving initialization info.
     */
    on(event: "VideoInputInitialized", listener: (info: VideoInputInitializationInfo) => void): this;
    /**
     * Registers a listener for audio input initialization.
     * @param event event name.
     * @param listener callback receiving initialization info.
     */
    on(event: "AudioInputInitialized", listener: (info: AudioInputInitializationInfo) => void): this;
    /**
     * Registers a listener for clips init failure.
     * @param event event name.
     * @param listener callback receiving error message and app name.
     */
    on(event: "ClipsInitFailure", listener: (errorMessage: string, applicationName: string) => void): this;
    /**
     * Registers a listener for clips recording ended.
     * @param event event name.
     * @param listener callback receiving source id and soundshare id.
     */
    on(event: "ClipsRecordingEnded", listener: (sourceId: string, soundshareId: number) => void): this;
    /**
     * Registers a listener for native screen share picker update.
     * @param event event name.
     * @param listener callback receiving existing state and content.
     */
    on(event: "NativeScreenSharePickerUpdate", listener: (existing: boolean, content: string) => void): this;
    /**
     * Registers a listener for native screen share picker cancel.
     * @param event event name.
     * @param listener callback receiving existing state.
     */
    on(event: "NativeScreenSharePickerCancel", listener: (existing: boolean) => void): this;
    /**
     * Registers a listener for native screen share picker error.
     * @param event event name.
     * @param listener callback receiving error string.
     */
    on(event: "NativeScreenSharePickerError", listener: (error: string) => void): this;
    /**
     * Registers a listener for audio device module error.
     * @param event event name.
     * @param listener callback receiving module, code and device name.
     */
    on(event: "AudioDeviceModuleError", listener: (module: string, code: number, deviceName: string) => void): this;
    /**
     * Registers a listener for video codec error.
     * @param event event name.
     * @param listener callback receiving error info.
     */
    on(event: "VideoCodecError", listener: (info: VideoCodecErrorInfo) => void): this;
    /**
     * Registers a listener for system microphone mode change.
     * @param event event name.
     * @param listener callback receiving new mode.
     */
    on(event: "SystemMicrophoneModeChange", listener: (mode: string) => void): this;
    /**
     * Registers a listener for events without arguments.
     * @param event event name.
     * @param listener callback with no arguments.
     */
    on(event: "Destroy" | "Silence" | "WatchdogTimeout" | "ClipsRecordingRestartNeeded" | "VoiceFiltersFailed", listener: () => void): this;
    /**
     * Registers a one-time listener for device changes.
     * @param event event name.
     * @param listener callback receiving device lists.
     */
    once(event: "DeviceChange", listener: (inputDevices: AudioDevice[], outputDevices: AudioDevice[], videoDevices: VideoDevice[]) => void): this;
    /**
     * Registers a one-time listener for volume changes.
     * @param event event name.
     * @param listener callback receiving input and output volumes.
     */
    once(event: "VolumeChange", listener: (inputVolume: number, outputVolume: number) => void): this;
    /**
     * Registers a one-time listener for events without arguments.
     * @param event event name.
     * @param listener callback with no arguments.
     */
    once(event: "Destroy" | "Silence" | "WatchdogTimeout" | "ClipsRecordingRestartNeeded" | "VoiceFiltersFailed", listener: () => void): this;
    /**
     * Removes a listener for device changes.
     * @param event event name.
     * @param listener callback to remove.
     */
    off(event: "DeviceChange", listener: (inputDevices: AudioDevice[], outputDevices: AudioDevice[], videoDevices: VideoDevice[]) => void): this;
    /**
     * Removes a listener for volume changes.
     * @param event event name.
     * @param listener callback to remove.
     */
    off(event: "VolumeChange", listener: (inputVolume: number, outputVolume: number) => void): this;
    /**
     * Removes a listener for events without arguments.
     * @param event event name.
     * @param listener callback to remove.
     */
    off(event: "Destroy" | "Silence" | "WatchdogTimeout" | "ClipsRecordingRestartNeeded" | "VoiceFiltersFailed", listener: () => void): this;
    /**
     * Removes all listeners for an event.
     * @param event event name, or all if omitted.
     */
    removeAllListeners(event?: MediaEngineEvent): this;
    /**
     * Gets the number of listeners for an event.
     * @param event event name.
     * @returns listener count.
     */
    listenerCount(event: MediaEngineEvent): number;

    /**
     * Applies video background filter settings.
     * @param settings filter settings to apply.
     */
    applyMediaFilterSettings(settings: MediaFilterSettings): Promise<void>;
    /**
     * Creates a new voice connection.
     * @param userId user id for the connection.
     * @param channelId channel to connect to.
     * @param options connection options.
     * @returns the created connection.
     */
    connect(userId: string, channelId: string, options: ConnectionOptions): MediaEngineConnection;
    /**
     * Checks if there are no active connections.
     * @returns true if no connections exist.
     */
    connectionsEmpty(): boolean;
    /**
     * Creates a replay connection from a file.
     * @param userId user id for the connection.
     * @param options replay options including file path.
     * @returns the created connection or null if unsupported.
     */
    createReplayConnection(userId: string, options: ReplayConnectionOptions): MediaEngineConnection | null;
    /** destroys the media engine and all connections. */
    destroy(): void;
    /**
     * Iterates over all connections.
     * @param callback called for each connection.
     * @param context optional context filter, only iterates connections in this context.
     */
    eachConnection(callback: (connection: MediaEngineConnection) => void, context?: MediaEngineContextType): void;
    /**
     * Enables the media engine.
     * @returns promise that resolves when enabled.
     */
    enable(): Promise<void>;
    /**
     * Exports a clip as a blob.
     * @param clipId clip identifier.
     * @param userId user who owns the clip.
     * @returns promise resolving to the clip blob.
     */
    exportClip(clipId: string, userId: string): Promise<Blob>;
    /**
     * Fetches async resources like DAVE keys.
     * @param options fetch options.
     */
    fetchAsyncResources(options: { fetchDave?: boolean; }): Promise<void>;

    /**
     * Gets available audio input devices.
     * @returns promise resolving to device list.
     */
    getAudioInputDevices(): Promise<AudioDevice[]>;
    /**
     * Gets the current audio layer name.
     * @returns audio layer identifier.
     */
    getAudioLayer(): string;
    /**
     * Gets available audio output devices.
     * @returns promise resolving to device list.
     */
    getAudioOutputDevices(): Promise<AudioDevice[]>;
    /**
     * Gets the current audio subsystem.
     * @returns active audio subsystem.
     */
    getAudioSubsystem(): AudioSubsystem;
    /**
     * Gets codec capabilities as JSON string.
     * @param callback called with capabilities string.
     */
    getCodecCapabilities(callback: (capabilities: string) => void): void;
    /**
     * Gets a survey of supported codecs.
     * @returns promise resolving to codec info.
     */
    getCodecSurvey(): Promise<{ codecs: CodecInfo[]; }>;
    /**
     * Gets whether debug logging is enabled.
     * @returns true if enabled.
     */
    getDebugLogging(): boolean;
    /**
     * Gets the current desktop source.
     * @returns promise that rejects with NO_STREAM error if not streaming.
     */
    getDesktopSource(): Promise<DesktopSource>;
    /**
     * Gets whether loopback is active.
     * @returns always false for native engine.
     */
    getLoopback(): boolean;
    /**
     * Gets MLS signing key for e2ee.
     * @param userId user id.
     * @param guildId guild id.
     * @returns promise resolving to key and signature.
     */
    getMLSSigningKey(userId: string, guildId: string): Promise<MLSSigningKey>;
    /**
     * Gets noise cancellation statistics.
     * @returns promise resolving to stats or null if disabled.
     */
    getNoiseCancellationStats(): Promise<NoiseCancellationStats | null>;
    /**
     * Gets screen preview thumbnails.
     * @param width thumbnail width.
     * @param height thumbnail height.
     * @returns promise resolving to preview list.
     */
    getScreenPreviews(width: number, height: number): Promise<ScreenPreview[]>;
    /**
     * Gets supported bandwidth estimation experiments.
     * @param callback called with experiment list.
     */
    getSupportedBandwidthEstimationExperiments(callback: (experiments: string[]) => void): void;
    /**
     * Gets supported secure frames protocol version.
     * @returns protocol version number.
     */
    getSupportedSecureFramesProtocolVersion(): number;
    /**
     * Gets supported video codecs.
     * @param callback called with codec name list.
     */
    getSupportedVideoCodecs(callback: (codecs: string[]) => void): void;
    /**
     * Gets system microphone mode.
     * @returns promise resolving to mode string.
     */
    getSystemMicrophoneMode(): Promise<string>;
    /**
     * Gets current video input device id.
     * @returns device id or "disabled".
     */
    getVideoInputDeviceId(): string;
    /**
     * Gets available video input devices.
     * @returns promise resolving to device list.
     */
    getVideoInputDevices(): Promise<VideoDevice[]>;
    /**
     * Gets window preview thumbnails.
     * @param width thumbnail width.
     * @param height thumbnail height.
     * @returns promise resolving to preview list.
     */
    getWindowPreviews(width: number, height: number): Promise<WindowPreview[]>;

    /** signals user interaction to enable autoplay. */
    interact(): void;
    /**
     * Shows native screen share picker.
     * @param options picker options.
     */
    presentNativeScreenSharePicker(options?: string): void;
    /**
     * Queues an audio subsystem switch.
     * @param subsystem subsystem to switch to.
     */
    queueAudioSubsystem(subsystem: AudioSubsystem): void;
    /**
     * Ranks RTC regions by latency.
     * @param regions region ids to test.
     * @returns promise resolving to sorted region ids.
     */
    rankRtcRegions(regions: string[]): Promise<string[]>;
    /** releases native desktop video source picker stream. */
    releaseNativeDesktopVideoSourcePickerStream(): void;

    /**
     * Saves a clip.
     * @param clipId clip identifier.
     * @param userId user who owns the clip.
     * @returns promise resolving to saved clip info.
     */
    saveClip(clipId: string, userId: string): Promise<SavedClip>;
    /**
     * Saves a clip for another user.
     * @param clipId clip identifier.
     * @param userId user to save for.
     * @param options clip metadata.
     * @returns promise resolving to saved clip info.
     */
    saveClipForUser(clipId: string, userId: string, options: ClipMetadata): Promise<SavedClip>;
    /**
     * Saves a screenshot.
     * @param channelId channel context.
     * @param userId user context.
     * @param width width or null for auto.
     * @param height height or null for auto.
     * @param options screenshot metadata.
     * @returns promise resolving to screenshot info.
     */
    saveScreenshot(channelId: string, userId: string, width: number | null, height: number | null, options: ClipMetadata): Promise<Screenshot>;

    /**
     * Enables or disables AEC dump.
     * @param enabled whether to enable.
     */
    setAecDump(enabled: boolean): void;
    /**
     * Sets callback for async clips source deinit.
     * @param callback callback function.
     */
    setAsyncClipsSourceDeinit(callback: () => void): void;
    /**
     * Sets callback for async video input device init.
     * @param callback callback function.
     */
    setAsyncVideoInputDeviceInit(callback: () => void): void;
    /**
     * Sets whether to bypass system audio input processing.
     * @param bypass whether to bypass.
     */
    setAudioInputBypassSystemProcessing(bypass: boolean): void;
    /**
     * Sets the audio input device.
     * @param deviceId device identifier.
     */
    setAudioInputDevice(deviceId: string): void;
    /**
     * Sets the audio output device.
     * @param deviceId device identifier.
     */
    setAudioOutputDevice(deviceId: string): void;
    /**
     * Sets the audio subsystem.
     * @param subsystem subsystem to use.
     */
    setAudioSubsystem(subsystem: AudioSubsystem): void;
    /**
     * Enables or disables AV1 codec.
     * @param enabled whether to enable.
     */
    setAv1Enabled(enabled: boolean): void;
    /**
     * Sets clip buffer length in seconds.
     * @param seconds buffer duration.
     */
    setClipBufferLength(seconds: number): void;
    /**
     * Enables or disables clips ML pipeline.
     * @param enabled whether to enable.
     */
    setClipsMLPipelineEnabled(enabled: boolean): void;
    /**
     * Enables or disables a clips ML pipeline type.
     * @param type pipeline type.
     * @param enabled whether to enable.
     */
    setClipsMLPipelineTypeEnabled(type: string, enabled: boolean): void;
    /**
     * Sets clips quality settings.
     * @param resolution resolution height.
     * @param frameRate frame rate.
     * @param hdr whether HDR is enabled.
     * @returns true if settings were applied.
     */
    setClipsQualitySettings(resolution: number, frameRate: number, hdr: boolean): boolean;
    /**
     * Sets or clears the clips source.
     * @param source source config or null to clear.
     */
    setClipsSource(source: ClipsSource | null): void;
    /**
     * Enables or disables debug logging.
     * @param enabled whether to enable.
     */
    setDebugLogging(enabled: boolean): void;
    /**
     * Sets or clears the go live source.
     * @param source source config or null to clear.
     * @param context context to apply to, defaults to "default".
     */
    setGoLiveSource(source: GoLiveSource | null, context?: MediaEngineContextType): void;
    /**
     * Enables or disables H264 codec.
     * @param enabled whether to enable.
     */
    setH264Enabled(enabled: boolean): void;
    /**
     * Enables or disables H265 codec.
     * @param enabled whether to enable.
     */
    setH265Enabled(enabled: boolean): void;
    /**
     * Sets whether device has fullband performance.
     * @param has whether it has fullband performance.
     */
    setHasFullbandPerformance(has: boolean): void;
    /**
     * Sets input volume.
     * @param volume volume 0-100.
     */
    setInputVolume(volume: number): void;
    /**
     * Enables loopback for testing.
     * @param reason reason for enabling loopback.
     * @param options loopback audio options.
     */
    setLoopback(reason: string, options: LoopbackOptions): void;
    /**
     * Sets max sync delay override.
     * @param delay delay in milliseconds.
     */
    setMaxSyncDelayOverride(delay: number): void;
    /**
     * Sets maybe preprocess mute state.
     * @param mute whether to mute.
     */
    setMaybePreprocessMute(mute: boolean): void;
    /**
     * Sets native desktop video source picker active state.
     * @param active whether picker is active.
     */
    setNativeDesktopVideoSourcePickerActive(active: boolean): void;
    /**
     * Enables or disables noise cancellation stats.
     * @param enabled whether to enable.
     */
    setNoiseCancellationEnableStats(enabled: boolean): void;
    /**
     * Sets whether to offload ADM controls.
     * @param offload whether to offload.
     */
    setOffloadAdmControls(offload: boolean): void;
    /**
     * Sets callback for video container resize.
     * @param callback callback function.
     */
    setOnVideoContainerResized(callback: () => void): void;
    /**
     * Sets output volume.
     * @param volume volume 0-100.
     */
    setOutputVolume(volume: number): void;
    /**
     * Enables or disables sidechain compression.
     * @param enabled whether to enable.
     */
    setSidechainCompression(enabled: boolean): void;
    /**
     * Sets sidechain compression strength.
     * @param strength strength 0-100.
     */
    setSidechainCompressionStrength(strength: number): void;
    /**
     * Sets soundshare source.
     * @param soundshareId soundshare source id.
     * @param active whether to enable.
     * @param context context to apply to, defaults to "default".
     */
    setSoundshareSource(soundshareId: number, active: boolean, context?: MediaEngineContextType): void;
    /**
     * Sets the video input device.
     * @param deviceId device identifier.
     */
    setVideoInputDevice(deviceId: string): Promise<void>;

    /**
     * Checks if a connection should broadcast video.
     * @param connection connection to check.
     * @returns true if should broadcast.
     */
    shouldConnectionBroadcastVideo(connection: MediaEngineConnection): boolean;
    /**
     * Shows system capture configuration UI.
     * @param options options including display id.
     */
    showSystemCaptureConfigurationUI(options: { displayId?: string; }): void;

    /** starts AEC dump recording. */
    startAecDump(): void;
    /**
     * Starts local audio recording.
     * @param options recording options.
     */
    startLocalAudioRecording(options: AudioRecordingOptions): Promise<void>;
    /**
     * Starts recording raw audio samples.
     * @param options sample options.
     */
    startRecordingRawSamples(options: RawSamplesOptions): void;
    /** stops AEC dump recording. */
    stopAecDump(): void;
    /**
     * Stops local audio recording.
     * @param callback called with success and filepath.
     */
    stopLocalAudioRecording(callback: (success: boolean, filepath: string) => void): void;
    /** stops recording raw audio samples. */
    stopRecordingRawSamples(): void;

    /**
     * Checks if media engine is supported.
     * @returns true if supported.
     */
    supported(): boolean;
    /**
     * Checks if a feature is supported.
     * @param feature feature to check.
     * @returns true if supported.
     */
    supports(feature: MediaEngineFeature): boolean;
    /**
     * Updates clip metadata.
     * @param clipId clip identifier.
     * @param metadata new metadata.
     */
    updateClipMetadata(clipId: string, metadata: ClipMetadata): Promise<void>;
    /** ticks the watchdog timer. */
    watchdogTick(): void;
    /**
     * Writes audio debug state to file.
     * @returns promise that resolves when written.
     */
    writeAudioDebugState(): Promise<void>;
}

/**
 * Persisted media engine settings for a context.
 */
export interface MediaEngineSettings {
    /** current voice mode (PTT or VAD), default VOICE_ACTIVITY. */
    mode: VoiceMode;
    /** voice mode configuration options. */
    modeOptions: ModeOptions;
    /** settings version for vadUseKrisp migration. */
    vadUseKrispSettingVersion: number;
    /** settings version for ncUseKrisp migration. */
    ncUseKrispSettingVersion: number;
    /** settings version for ncUseKrispjs migration. */
    ncUseKrispjsSettingVersion: number;
    /** whether self is muted, default false. */
    mute: boolean;
    /** whether self is deafened, default false. */
    deaf: boolean;
    /** whether echo cancellation is enabled, default false. */
    echoCancellation: boolean;
    /** whether noise suppression is enabled, default false. */
    noiseSuppression: boolean;
    /** whether automatic gain control is enabled, default true. */
    automaticGainControl: boolean;
    /** whether krisp noise cancellation is enabled, default false. */
    noiseCancellation: boolean;
    /** whether to bypass system audio input processing, default false. */
    bypassSystemInputProcessing: boolean;
    /** most recently requested voice filter id, null if none. */
    mostRecentlyRequestedVoiceFilter: string | null;
    /** whether voice filter playback is enabled, default false. */
    voiceFilterPlaybackEnabled: boolean;
    /** version for hardware enabled migration. */
    hardwareEnabledVersion: number;
    /** whether silence warning is enabled, default true. */
    silenceWarning: boolean;
    /** attenuation level 0-100 for other users when speaking, default 0. */
    attenuation: number;
    /** whether to attenuate others when self is speaking, default false. */
    attenuateWhileSpeakingSelf: boolean;
    /** whether to attenuate others when others are speaking, default true. */
    attenuateWhileSpeakingOthers: boolean;
    /** per-user local mute states, keyed by user id. */
    localMutes: { [userId: string]: boolean; };
    /** per-user disabled local video states, keyed by user id. */
    disabledLocalVideos: { [userId: string]: boolean; };
    /** per-user video toggle states, keyed by user id. */
    videoToggleStateMap: { [userId: string]: VideoToggleState; };
    /** per-user local volume levels 0-200, keyed by user id, default 100. */
    localVolumes: { [userId: string]: number; };
    /** per-user stereo pan settings, keyed by user id. */
    localPans: { [userId: string]: LocalPan; };
    /** microphone input volume 0-100, default 100. */
    inputVolume: number;
    /** speaker output volume 0-100, default 100. */
    outputVolume: number;
    /** selected audio input device id. */
    inputDeviceId: string;
    /** selected audio output device id. */
    outputDeviceId: string;
    /** selected video input device id. */
    videoDeviceId: string;
    /** whether QoS packet priority is enabled. */
    qos: boolean;
    /** whether QoS has been migrated. */
    qosMigrated: boolean;
    /** whether video hook is enabled. */
    videoHook: boolean;
    /** experimental soundshare setting, null if not set. */
    experimentalSoundshare2: boolean | null;
    /** system screenshare picker setting, null if not set. */
    useSystemScreensharePicker: boolean | null;
    /** whether H265 codec is enabled. */
    h265Enabled: boolean;
    /** whether VAD threshold has been migrated. */
    vadThrehsoldMigrated: boolean;
    /** whether AEC dump is enabled. */
    aecDumpEnabled: boolean;
    /** whether sidechain compression is enabled. */
    sidechainCompression: boolean;
    /** settings version for sidechain compression migration. */
    sidechainCompressionSettingVersion: number;
    /** sidechain compression strength 0-100, default 50. */
    sidechainCompressionStrength: number;
    /** whether automatic audio subsystem selection is enabled. */
    automaticAudioSubsystem: boolean;
    /** active input profile or null. */
    activeInputProfile: InputProfile | null;
}

/**
 * Complete serializable state of MediaEngineStore.
 */
export interface MediaEngineState {
    /** settings for each context type, keyed by context. */
    settingsByContext: { [context in MediaEngineContextType]: MediaEngineSettings; };
    /** available audio input devices, keyed by device id. */
    inputDevices: { [deviceId: string]: AudioDevice; };
    /** available audio output devices, keyed by device id. */
    outputDevices: { [deviceId: string]: AudioDevice; };
    /** supported features, keyed by feature name. */
    appSupported: { [feature in MediaEngineFeature]?: boolean; };
    /** whether krisp module is loaded. */
    krispModuleLoaded: boolean;
    /** krisp module version or undefined. */
    krispVersion: string | undefined;
    /** krisp suppression level or undefined. */
    krispSuppressionLevel: number | undefined;
    /** current go live source or undefined. */
    goLiveSource: GoLiveSource | undefined;
    /** context for go live. */
    goLiveContext: MediaEngineContextType;
}

/**
 * Keyboard shortcut binding.
 */
export interface Shortcut {
    /** action the shortcut triggers. */
    action: string;
    /** keys in the shortcut combination. */
    shortcut: string[];
}

/**
 * Flux store managing audio/video settings, devices, and the media engine.
 * Handles voice activity detection, noise cancellation, device selection,
 * and go live streaming configuration.
 */
export class MediaEngineStore extends FluxStore {
    /** fetches async resources like DAVE keys. */
    fetchAsyncResources(): void;
    /**
     * Gets the active input profile.
     * @returns current input profile.
     */
    getActiveInputProfile(): InputProfile;
    /**
     * Gets the active voice filter id.
     * @returns voice filter id or null if none active.
     */
    getActiveVoiceFilter(): string | null;
    /**
     * Gets when the active voice filter was applied.
     * @returns application date or null if none active.
     */
    getActiveVoiceFilterAppliedAt(): Date | null;
    /**
     * Gets whether AEC dump is enabled.
     * @returns true if enabled.
     */
    getAecDump(): boolean;
    /**
     * Gets whether to attenuate while others are speaking.
     * @returns true if enabled.
     */
    getAttenuateWhileSpeakingOthers(): boolean;
    /**
     * Gets whether to attenuate while self is speaking.
     * @returns true if enabled.
     */
    getAttenuateWhileSpeakingSelf(): boolean;
    /**
     * Gets the attenuation level.
     * @returns attenuation 0-100, default 0.
     */
    getAttenuation(): number;
    /**
     * Gets the current audio subsystem.
     * @returns active audio subsystem.
     */
    getAudioSubsystem(): AudioSubsystem;
    /**
     * Gets whether automatic gain control is enabled.
     * @returns true if enabled.
     */
    getAutomaticGainControl(): boolean;
    /**
     * Gets whether system audio input processing is bypassed.
     * @returns true if bypassed.
     */
    getBypassSystemInputProcessing(): boolean;
    /**
     * Gets the camera preview component.
     * @returns react component for camera preview.
     */
    getCameraComponent(): React.ComponentType;
    /**
     * Gets whether debug logging is enabled.
     * @returns true if enabled.
     */
    getDebugLogging(): boolean;
    /**
     * Gets whether echo cancellation is enabled.
     * @returns true if enabled.
     */
    getEchoCancellation(): boolean;
    /**
     * Gets whether silence warning is enabled.
     * @returns true if enabled.
     */
    getEnableSilenceWarning(): boolean;
    /**
     * Gets whether user has ever spoken while muted.
     * @returns true if has spoken while muted.
     */
    getEverSpeakingWhileMuted(): boolean;
    /**
     * Gets whether experimental soundshare is enabled.
     * @returns true if enabled.
     */
    getExperimentalSoundshare(): boolean;
    /**
     * Gets the go live context.
     * @returns current go live context.
     */
    getGoLiveContext(): MediaEngineContextType;
    /**
     * Gets the current go live source.
     * @returns go live source or null if not streaming.
     */
    getGoLiveSource(): GoLiveSource | null;
    /**
     * Gets the GPU brand name.
     * @returns GPU brand string.
     */
    getGpuBrand(): string;
    /**
     * Gets whether H265 is enabled.
     * @returns true if enabled.
     */
    getH265Enabled(): boolean;
    /**
     * Gets whether hardware encoding is enabled.
     * @returns true if enabled.
     */
    getHardwareEncoding(): boolean;
    /**
     * Gets whether audio input is detected.
     * @returns true if detected, false if not, null if unknown.
     */
    getInputDetected(): boolean | null;
    /**
     * Gets the selected audio input device id.
     * @returns device id.
     */
    getInputDeviceId(): string;
    /**
     * Gets available audio input devices.
     * @returns devices keyed by device id.
     */
    getInputDevices(): { [deviceId: string]: AudioDevice; };
    /**
     * Gets the input volume.
     * @returns volume 0-100, default 100.
     */
    getInputVolume(): number;
    /**
     * Gets whether krisp stats are enabled.
     * @returns true if enabled.
     */
    getKrispEnableStats(): boolean;
    /**
     * Gets the krisp model override.
     * @returns model name or undefined if not set.
     */
    getKrispModelOverride(): string | undefined;
    /**
     * Gets available krisp models.
     * @returns array of model names.
     */
    getKrispModels(): string[];
    /**
     * Gets the krisp suppression level.
     * @returns suppression level 0-100, default 100.
     */
    getKrispSuppressionLevel(): number;
    /**
     * Gets the krisp VAD activation threshold.
     * @returns threshold 0-1, default 0.8.
     */
    getKrispVadActivationThreshold(): number;
    /**
     * Gets the timestamp of the last audio input device change.
     * @returns timestamp in milliseconds.
     */
    getLastAudioInputDeviceChangeTimestamp(): number;
    /**
     * Gets the stereo pan for a user.
     * @param userId user to get pan for.
     * @param context settings context, defaults to "default".
     * @returns pan with left/right 0-1, default {left: 1, right: 1}.
     */
    getLocalPan(userId: string, context?: MediaEngineContextType): LocalPan;
    /**
     * Gets the volume for a user.
     * @param userId user to get volume for.
     * @param context settings context, defaults to "default".
     * @returns volume 0-200, default 100.
     */
    getLocalVolume(userId: string, context?: MediaEngineContextType): number;
    /**
     * Gets whether loopback is enabled.
     * @returns true if enabled.
     */
    getLoopback(): boolean;
    /**
     * Gets the reasons loopback is enabled.
     * @returns set of reason strings.
     */
    getLoopbackReasons(): Set<string>;
    /**
     * Gets the media engine instance.
     * @returns the media engine.
     */
    getMediaEngine(): MediaEngine;
    /**
     * Gets MLS signing key for e2ee.
     * @param userId user id.
     * @param guildId guild id.
     * @returns promise resolving to key and signature.
     */
    getMLSSigningKey(userId: string, guildId: string): Promise<MLSSigningKey>;
    /**
     * Gets the current voice mode.
     * @param context settings context, defaults to "default".
     * @returns current voice mode.
     */
    getMode(context?: MediaEngineContextType): VoiceMode;
    /**
     * Gets the mode options.
     * @param context settings context, defaults to "default".
     * @returns current mode options.
     */
    getModeOptions(context?: MediaEngineContextType): ModeOptions;
    /**
     * Gets the most recently requested voice filter.
     * @returns voice filter id or null if none.
     */
    getMostRecentlyRequestedVoiceFilter(): string | null;
    /**
     * Gets whether no input detected notice is shown.
     * @returns true if shown.
     */
    getNoInputDetectedNotice(): boolean;
    /**
     * Gets whether noise cancellation is enabled.
     * @returns true if enabled.
     */
    getNoiseCancellation(): boolean;
    /**
     * Gets whether noise suppression is enabled.
     * @returns true if enabled.
     */
    getNoiseSuppression(): boolean;
    /**
     * Gets the selected audio output device id.
     * @returns device id.
     */
    getOutputDeviceId(): string;
    /**
     * Gets available audio output devices.
     * @returns devices keyed by device id.
     */
    getOutputDevices(): { [deviceId: string]: AudioDevice; };
    /**
     * Gets the output volume.
     * @returns volume 0-100, default 100.
     */
    getOutputVolume(): number;
    /**
     * Gets the packet delay.
     * @returns delay in milliseconds.
     */
    getPacketDelay(): number;
    /**
     * Gets the previous voice filter.
     * @returns voice filter id or null if none.
     */
    getPreviousVoiceFilter(): string | null;
    /**
     * Gets when the previous voice filter was applied.
     * @returns application date or null if none.
     */
    getPreviousVoiceFilterAppliedAt(): Date | null;
    /**
     * Gets whether QoS is enabled.
     * @returns true if enabled.
     */
    getQoS(): boolean;
    /**
     * Gets the settings for a context.
     * @param context settings context, defaults to "default".
     * @returns current settings.
     */
    getSettings(context?: MediaEngineContextType): MediaEngineSettings;
    /**
     * Gets registered shortcuts.
     * @returns shortcuts keyed by action.
     */
    getShortcuts(): { [action: string]: Shortcut; };
    /**
     * Gets whether sidechain compression is enabled.
     * @returns true if enabled.
     */
    getSidechainCompression(): boolean;
    /**
     * Gets the sidechain compression strength.
     * @returns strength 0-100, default 50.
     */
    getSidechainCompressionStrength(): number;
    /**
     * Gets whether currently speaking while muted.
     * @returns true if speaking while muted.
     */
    getSpeakingWhileMuted(): boolean;
    /**
     * Gets the complete store state.
     * @returns current state.
     */
    getState(): MediaEngineState;
    /**
     * Gets supported secure frames protocol version.
     * @returns protocol version number.
     */
    getSupportedSecureFramesProtocolVersion(): number;
    /**
     * Gets the system microphone mode.
     * @returns mode string or undefined if not available.
     */
    getSystemMicrophoneMode(): string | undefined;
    /**
     * Gets whether gamescope capture is used.
     * @returns true if used.
     */
    getUseGamescopeCapture(): boolean;
    /**
     * Gets whether system screenshare picker is used.
     * @returns true if used.
     */
    getUseSystemScreensharePicker(): boolean;
    /**
     * Gets whether VA-API encoder is used.
     * @returns true if used.
     */
    getUseVaapiEncoder(): boolean;
    /**
     * Gets the video display component.
     * @returns react component for video display.
     */
    getVideoComponent(): React.ComponentType;
    /**
     * Gets the selected video device id.
     * @returns device id.
     */
    getVideoDeviceId(): string;
    /**
     * Gets available video devices.
     * @returns devices keyed by device id.
     */
    getVideoDevices(): { [deviceId: string]: VideoDevice; };
    /**
     * Gets whether video hook is enabled.
     * @returns true if enabled.
     */
    getVideoHook(): boolean;
    /**
     * Gets video stream parameters.
     * @param context settings context, defaults to "default".
     * @returns array of stream parameters.
     */
    getVideoStreamParameters(context?: MediaEngineContextType): VideoStreamParameter[];
    /**
     * Gets the video toggle state for a user.
     * @param userId user to check.
     * @param context settings context, defaults to "default".
     * @returns toggle state, NONE if not in map.
     */
    getVideoToggleState(userId: string, context?: MediaEngineContextType): VideoToggleState;
    /**
     * Gets whether voice filter playback is enabled.
     * @returns true if enabled.
     */
    getVoiceFilterPlaybackEnabled(): boolean;

    /**
     * Gets whether go live simulcast is enabled.
     * @returns true if enabled.
     */
    goLiveSimulcastEnabled(): boolean;

    /**
     * Checks if there is an active CallKit call.
     * @returns true if active.
     */
    hasActiveCallKitCall(): boolean;
    /**
     * Checks if there is a clips source.
     * @returns true if has source.
     */
    hasClipsSource(): boolean;
    /**
     * Checks if a context exists.
     * @param context context to check.
     * @returns true if exists.
     */
    hasContext(context: MediaEngineContextType): boolean;
    /**
     * Checks if H265 hardware decode is available.
     * @returns true if available.
     */
    hasH265HardwareDecode(): boolean;

    /**
     * Checks if advanced voice activity is supported.
     * @returns true if supported.
     */
    isAdvancedVoiceActivitySupported(): boolean;
    /**
     * Checks if AEC dump is supported.
     * @returns true if supported.
     */
    isAecDumpSupported(): boolean;
    /**
     * Checks if any local video is auto disabled.
     * @param context settings context, defaults to "default".
     * @returns true if any auto disabled.
     */
    isAnyLocalVideoAutoDisabled(context?: MediaEngineContextType): boolean;
    /**
     * Checks if automatic gain control is supported.
     * @returns true if supported.
     */
    isAutomaticGainControlSupported(): boolean;
    /**
     * Checks if self is deafened.
     * @returns true if deafened.
     */
    isDeaf(): boolean;
    /**
     * Checks if hardware mute notice is enabled.
     * @returns true if enabled.
     */
    isEnableHardwareMuteNotice(): boolean;
    /**
     * Checks if media engine is enabled.
     * @returns true if enabled.
     */
    isEnabled(): boolean;
    /**
     * Checks if hardware mute is active.
     * @param context settings context, defaults to "default".
     * @returns true if hardware muted.
     */
    isHardwareMute(context?: MediaEngineContextType): boolean;
    /**
     * Checks if input profile is custom.
     * @returns true if custom.
     */
    isInputProfileCustom(): boolean;
    /**
     * Checks if user interaction is required.
     * @returns true if required.
     */
    isInteractionRequired(): boolean;
    /**
     * Checks if a user is locally muted.
     * @param userId user to check.
     * @param context settings context, defaults to "default".
     * @returns true if muted.
     */
    isLocalMute(userId: string, context?: MediaEngineContextType): boolean;
    /**
     * Checks if a user's video is auto disabled.
     * @param userId user to check.
     * @param context settings context, defaults to "default".
     * @returns true if auto disabled.
     */
    isLocalVideoAutoDisabled(userId: string, context?: MediaEngineContextType): boolean;
    /**
     * Checks if a user's video is disabled.
     * @param userId user to check.
     * @param context settings context, defaults to "default".
     * @returns true if disabled.
     */
    isLocalVideoDisabled(userId: string, context?: MediaEngineContextType): boolean;
    /**
     * Checks if media filter settings are loading.
     * @returns true if loading.
     */
    isMediaFilterSettingLoading(): boolean;
    /**
     * Checks if self is muted.
     * @returns true if muted.
     */
    isMute(): boolean;
    /**
     * Checks if native audio permission is ready.
     * @returns true if ready.
     */
    isNativeAudioPermissionReady(): boolean;
    /**
     * Checks if there was a noise cancellation error.
     * @returns true if error occurred.
     */
    isNoiseCancellationError(): boolean;
    /**
     * Checks if noise cancellation is supported.
     * @returns true if supported.
     */
    isNoiseCancellationSupported(): boolean;
    /**
     * Checks if noise suppression is supported.
     * @returns true if supported.
     */
    isNoiseSuppressionSupported(): boolean;
    /**
     * Checks if screen sharing is active.
     * @param context settings context, defaults to "default".
     * @returns true if sharing.
     */
    isScreenSharing(context?: MediaEngineContextType): boolean;
    /**
     * Checks if self is deafened in context.
     * @param context settings context, defaults to "default".
     * @returns true if deafened.
     */
    isSelfDeaf(context?: MediaEngineContextType): boolean;
    /**
     * Checks if self is muted in context.
     * @param context settings context, defaults to "default".
     * @returns true if muted.
     */
    isSelfMute(context?: MediaEngineContextType): boolean;
    /**
     * Checks if self is temporarily muted.
     * @param context settings context, defaults to "default".
     * @returns true if temporarily muted.
     */
    isSelfMutedTemporarily(context?: MediaEngineContextType): boolean;
    /**
     * Checks if simulcast is supported.
     * @returns true if supported.
     */
    isSimulcastSupported(): boolean;
    /**
     * Checks if sound sharing is active.
     * @param context settings context, defaults to "default".
     * @returns true if sharing.
     */
    isSoundSharing(context?: MediaEngineContextType): boolean;
    /**
     * Checks if media engine is supported.
     * @returns true if supported.
     */
    isSupported(): boolean;
    /**
     * Checks if video is available.
     * @returns true if available.
     */
    isVideoAvailable(): boolean;
    /**
     * Checks if video is enabled.
     * @returns true if enabled.
     */
    isVideoEnabled(): boolean;

    /** notifies that mute/unmute sound was skipped. */
    notifyMuteUnmuteSoundWasSkipped(): void;
    /**
     * Sets whether a user can have priority speaker.
     * @param userId user to set.
     * @param canHavePriority whether can have priority.
     */
    setCanHavePriority(userId: string, canHavePriority: boolean): void;
    /**
     * Sets whether there is an active CallKit call.
     * @param active whether active.
     */
    setHasActiveCallKitCall(active: boolean): void;
    /**
     * Checks if manual subsystem selection should be offered.
     * @returns true if should offer.
     */
    shouldOfferManualSubsystemSelection(): boolean;
    /**
     * Checks if mute/unmute sound should be skipped.
     * @returns true if should skip.
     */
    shouldSkipMuteUnmuteSound(): boolean;
    /**
     * Checks if bypass system input processing should be shown.
     * @returns true if should show.
     */
    showBypassSystemInputProcessing(): boolean;

    /** starts preloading DAVE encryption. */
    startDavePreload(): void;

    /**
     * Checks if a feature is supported.
     * @param feature feature to check.
     * @returns true if supported.
     */
    supports(feature: MediaEngineFeature): boolean;
    /**
     * Checks if disable local video is supported.
     * @returns true if supported.
     */
    supportsDisableLocalVideo(): boolean;
    /**
     * Checks if experimental soundshare is supported.
     * @returns true if supported.
     */
    supportsExperimentalSoundshare(): boolean;
    /**
     * Checks if hook soundshare is supported.
     * @returns true if supported.
     */
    supportsHookSoundshare(): boolean;
    /**
     * Checks if in-app capture is supported for an app.
     * @param appName application name.
     * @returns true if supported.
     */
    supportsInApp(appName: string): boolean;
    /**
     * Checks if screen soundshare is supported.
     * @returns true if supported.
     */
    supportsScreenSoundshare(): boolean;
    /**
     * Checks if system screenshare picker is supported.
     * @returns true if supported.
     */
    supportsSystemScreensharePicker(): boolean;
    /**
     * Checks if video hook is supported.
     * @returns true if supported.
     */
    supportsVideoHook(): boolean;
}
