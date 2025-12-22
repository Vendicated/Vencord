import { FluxStore } from "..";

export interface AudioDevice {
    id: string;
    index: number;
    name: string;
    disabled: boolean;
    facing?: string;
    guid: string;
    hardwareId: string;
    containerId: string;
    effects?: unknown;
}

export interface VideoDevice {
    id: string;
    index: number;
    name: string;
    disabled: boolean;
    facing?: string;
    guid: string;
    hardwareId?: string;
    containerId?: string;
    effects?: unknown;
}

export interface ClipsSource {
    quality: {
        frameRate: number;
        resolution: number;
    };
    desktopDescription: {
        id: string;
        soundshareId: number;
        useLoopback: boolean;
        useVideoHook: boolean;
        useGraphicsCapture: boolean;
        useQuartzCapturer: boolean;
        allowScreenCaptureKit: boolean;
        hdrCaptureMode: string;
    };
}

export interface GoLiveSource {
    desktopSource: {
        id: string;
        sourcePid: number | null;
        soundshareId: string | null;
        soundshareSession: string | null;
    };
    quality: {
        resolution: number;
        frameRate: number;
    };
}

export interface VideoStreamParameter {
    rid: string;
    type: string;
    quality: number;
}

export interface LocalPan {
    left: number;
    right: number;
}

export interface ModeOptions {
    threshold: number;
    autoThreshold: boolean;
    vadUseKrisp: boolean;
    vadKrispActivationThreshold: number;
    vadLeading: number;
    vadTrailing: number;
    delay: number;
    shortcut: string[];
    vadDuringPreProcess?: boolean;
}

export interface LoopbackOptions {
    echoCancellation: boolean;
    noiseSuppression: boolean;
    automaticGainControl: boolean;
    noiseCancellation: boolean;
}

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

export type MediaEngineContext = "default" | "stream";

export interface MediaEngine {
    Camera: React.ComponentType<{ disabled?: boolean; deviceId?: string; width?: number; height?: number; }>;
    Video: React.ComponentType & { onContainerResized: () => void; };

    on(event: MediaEngineEvent, listener: (...args: unknown[]) => void): this;
    once(event: MediaEngineEvent, listener: (...args: unknown[]) => void): this;
    off(event: MediaEngineEvent, listener: (...args: unknown[]) => void): this;
    emit(event: MediaEngineEvent, ...args: unknown[]): boolean;
    removeAllListeners(event?: MediaEngineEvent): this;
    listenerCount(event: MediaEngineEvent): number;

    applyMediaFilterSettings(settings: unknown): Promise<void>;
    connect(userId: string, channelId: string, options: unknown): unknown;
    connectionsEmpty(): boolean;
    createReplayConnection(userId: string, options: unknown): unknown;
    destroy(): void;
    eachConnection(callback: (connection: unknown) => void, context?: string): void;
    enable(): Promise<void>;
    exportClip(clipId: string, userId: string): Promise<Blob>;
    fetchAsyncResources(options: { fetchDave?: boolean; }): Promise<void>;

    getAudioInputDevices(): AudioDevice[];
    getAudioLayer(): string;
    getAudioOutputDevices(): AudioDevice[];
    getAudioSubsystem(): string;
    getCodecCapabilities(callback: (capabilities: string) => void): void;
    getCodecSurvey(): Promise<unknown>;
    getDebugLogging(): boolean;
    getDesktopSource(): Promise<unknown>;
    getLoopback(): boolean;
    getMLSSigningKey(userId: string, guildId: string): Promise<{ key: unknown; signature: unknown; }>;
    getNoiseCancellationStats(): Promise<unknown>;
    getScreenPreviews(width: number, height: number): Promise<unknown[]>;
    getSupportedBandwidthEstimationExperiments(callback: (experiments: unknown) => void): void;
    getSupportedSecureFramesProtocolVersion(): number;
    getSupportedVideoCodecs(callback: (codecs: string[]) => void): void;
    getSystemMicrophoneMode(): Promise<string>;
    getVideoInputDeviceId(): string;
    getVideoInputDevices(): VideoDevice[];
    getWindowPreviews(width: number, height: number): Promise<unknown[]>;

    interact(): void;
    presentNativeScreenSharePicker(options?: string): void;
    queueAudioSubsystem(subsystem: string): void;
    rankRtcRegions(regions: string[]): Promise<string[]>;
    releaseNativeDesktopVideoSourcePickerStream(): void;

    saveClip(clipId: string, userId: string): Promise<unknown>;
    saveClipForUser(clipId: string, userId: string, options: unknown): Promise<unknown>;
    saveScreenshot(channelId: string, userId: string, width: number | null, height: number | null, options: unknown): Promise<unknown>;

    setAecDump(value: boolean): void;
    setAsyncClipsSourceDeinit(callback: () => void): void;
    setAsyncVideoInputDeviceInit(callback: () => void): void;
    setAudioInputBypassSystemProcessing(value: boolean): void;
    setAudioInputDevice(deviceId: string): void;
    setAudioOutputDevice(deviceId: string): void;
    setAudioSubsystem(subsystem: string): void;
    setAv1Enabled(value: boolean): void;
    setClipBufferLength(length: number): void;
    setClipsMLPipelineEnabled(value: boolean): void;
    setClipsMLPipelineTypeEnabled(type: string, enabled: boolean): void;
    setClipsQualitySettings(resolution: number, frameRate: number, hdr: boolean): boolean;
    setClipsSource(source: ClipsSource | null): void;
    setDebugLogging(value: boolean): void;
    setGoLiveSource(source: GoLiveSource | null, context?: string): void;
    setH264Enabled(value: boolean): void;
    setH265Enabled(value: boolean): void;
    setHasFullbandPerformance(value: boolean): void;
    setInputVolume(volume: number): void;
    setLoopback(reason: string, options: LoopbackOptions): void;
    setMaxSyncDelayOverride(delay: number): void;
    setMaybePreprocessMute(value: boolean): void;
    setNativeDesktopVideoSourcePickerActive(value: boolean): void;
    setNoiseCancellationEnableStats(value: boolean): void;
    setOffloadAdmControls(value: boolean): void;
    setOnVideoContainerResized(callback: () => void): void;
    setOutputVolume(volume: number): void;
    setSidechainCompression(value: boolean): void;
    setSidechainCompressionStrength(strength: number): void;
    setSoundshareSource(soundshareId: number, enabled: boolean, context?: string): void;
    setVideoInputDevice(deviceId: string): Promise<void>;

    shouldConnectionBroadcastVideo(connection: unknown): boolean;
    showSystemCaptureConfigurationUI(options: unknown): void;

    startAecDump(): void;
    startLocalAudioRecording(options: unknown): Promise<void>;
    startRecordingRawSamples(options: unknown): void;
    stopAecDump(): void;
    stopLocalAudioRecording(callback: (success: boolean, data: unknown) => void): void;
    stopRecordingRawSamples(): void;

    supported(): boolean;
    supports(feature: string): boolean;
    updateClipMetadata(clipId: string, metadata: unknown): Promise<void>;
    watchdogTick(): void;
    writeAudioDebugState(): Promise<void>;
}

export class MediaEngineStore extends FluxStore {
    fetchAsyncResources(): void;
    getActiveInputProfile(): string;
    getActiveVoiceFilter(): string | null;
    getActiveVoiceFilterAppliedAt(): Date | null;
    getAecDump(): boolean;
    getAttenuateWhileSpeakingOthers(): boolean;
    getAttenuateWhileSpeakingSelf(): boolean;
    getAttenuation(): number;
    getAudioSubsystem(): string;
    getAutomaticGainControl(): boolean;
    getBypassSystemInputProcessing(): boolean;
    getCameraComponent(): React.ComponentType;
    getDebugLogging(): boolean;
    getEchoCancellation(): boolean;
    getEnableSilenceWarning(): boolean;
    getEverSpeakingWhileMuted(): boolean;
    getExperimentalSoundshare(): boolean;
    getGoLiveContext(): string;
    getGoLiveSource(): GoLiveSource | null;
    getGpuBrand(): string;
    getH265Enabled(): boolean;
    getHardwareEncoding(): boolean;
    getInputDetected(): boolean | null;
    getInputDeviceId(): string;
    getInputDevices(): Record<string, AudioDevice>;
    getInputVolume(): number;
    getKrispEnableStats(): boolean;
    getKrispModelOverride(): string | undefined;
    getKrispModels(): string[];
    getKrispSuppressionLevel(): number;
    getKrispVadActivationThreshold(): number;
    getLastAudioInputDeviceChangeTimestamp(): number;
    getLocalPan(userId: string, context?: string): LocalPan;
    getLocalVolume(userId: string, context?: string): number;
    getLoopback(): boolean;
    getLoopbackReasons(): Set<string>;
    getMediaEngine(): MediaEngine;
    getMLSSigningKey(userId: string, guildId: string): Promise<unknown>;
    getMode(context?: string): string;
    getModeOptions(context?: string): ModeOptions;
    getMostRecentlyRequestedVoiceFilter(): string | null;
    getNoInputDetectedNotice(): boolean;
    getNoiseCancellation(): boolean;
    getNoiseSuppression(): boolean;
    getOutputDeviceId(): string;
    getOutputDevices(): Record<string, AudioDevice>;
    getOutputVolume(): number;
    getPacketDelay(): number;
    getPreviousVoiceFilter(): string | null;
    getPreviousVoiceFilterAppliedAt(): Date | null;
    getQoS(): boolean;
    getSettings(context?: string): Record<string, unknown>;
    getShortcuts(): Record<string, unknown>;
    getSidechainCompression(): boolean;
    getSidechainCompressionStrength(): number;
    getSpeakingWhileMuted(): boolean;
    getState(): {
        settingsByContext: Record<string, unknown>;
        inputDevices: Record<string, AudioDevice>;
        outputDevices: Record<string, AudioDevice>;
        appSupported: Record<string, boolean>;
        krispModuleLoaded: boolean;
        krispVersion: string | undefined;
        krispSuppressionLevel: number | undefined;
        goLiveSource: GoLiveSource | undefined;
        goLiveContext: string;
    };
    getSupportedSecureFramesProtocolVersion(): number;
    getSystemMicrophoneMode(): string | undefined;
    getUseGamescopeCapture(): boolean;
    getUseSystemScreensharePicker(): boolean;
    getUseVaapiEncoder(): boolean;
    getVideoComponent(): React.ComponentType;
    getVideoDeviceId(): string;
    getVideoDevices(): Record<string, VideoDevice>;
    getVideoHook(): boolean;
    getVideoStreamParameters(context?: string): VideoStreamParameter[];
    getVideoToggleState(userId: string, context?: string): string;
    getVoiceFilterPlaybackEnabled(): boolean;

    goLiveSimulcastEnabled(): boolean;

    hasActiveCallKitCall(): boolean;
    hasClipsSource(): boolean;
    hasContext(context: string): boolean;
    hasH265HardwareDecode(): boolean;

    isAdvancedVoiceActivitySupported(): boolean;
    isAecDumpSupported(): boolean;
    isAnyLocalVideoAutoDisabled(context?: string): boolean;
    isAutomaticGainControlSupported(): boolean;
    isDeaf(): boolean;
    isEnableHardwareMuteNotice(): boolean;
    isEnabled(): boolean;
    isHardwareMute(context?: string): boolean;
    isInputProfileCustom(): boolean;
    isInteractionRequired(): boolean;
    isLocalMute(userId: string, context?: string): boolean;
    isLocalVideoAutoDisabled(userId: string, context?: string): boolean;
    isLocalVideoDisabled(userId: string, context?: string): boolean;
    isMediaFilterSettingLoading(): boolean;
    isMute(): boolean;
    isNativeAudioPermissionReady(): boolean;
    isNoiseCancellationError(): boolean;
    isNoiseCancellationSupported(): boolean;
    isNoiseSuppressionSupported(): boolean;
    isScreenSharing(context?: string): boolean;
    isSelfDeaf(context?: string): boolean;
    isSelfMute(context?: string): boolean;
    isSelfMutedTemporarily(context?: string): boolean;
    isSimulcastSupported(): boolean;
    isSoundSharing(context?: string): boolean;
    isSupported(): boolean;
    isVideoAvailable(): boolean;
    isVideoEnabled(): boolean;

    notifyMuteUnmuteSoundWasSkipped(): void;
    setCanHavePriority(userId: string, value: boolean): void;
    setHasActiveCallKitCall(active: boolean): void;
    shouldOfferManualSubsystemSelection(): boolean;
    shouldSkipMuteUnmuteSound(): boolean;
    showBypassSystemInputProcessing(): boolean;

    startDavePreload(): void;

    supports(feature: string): boolean;
    supportsDisableLocalVideo(): boolean;
    supportsExperimentalSoundshare(): boolean;
    supportsHookSoundshare(): boolean;
    supportsInApp(appName: string): boolean;
    supportsScreenSoundshare(): boolean;
    supportsSystemScreensharePicker(): boolean;
    supportsVideoHook(): boolean;
}
