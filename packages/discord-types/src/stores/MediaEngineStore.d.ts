import { FluxStore } from "..";

type VideoDevice = {
    containerId: string;
    disabled: boolean;
    effects: any;
    facing: string;
    guid: string;
    hardwareId: string;
    id: string;
    index: number;
    name: string;
};

type GoLiveSource = {
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
};

type CodecCapabilities = (codecs: string) => void;

interface MediaEngine {
    connectionsEmpty(): boolean;
    getAudioLayer(): boolean;
    getCodecCapabilities(callback: (CodecCapabilities: string) => void): string;
    getDebugLogging(): boolean;

    setAecDump(value: boolean): void;
    setAv1Enabled(value: boolean): void;
    setDebugLogging(value: boolean): void;
    setH265Enabled(value: boolean): void;
    setH264Enabled(value: boolean): void;
    setInputVolume(volume: number): void;
    setLoopback(reason: string, enabled: boolean): void;
    setNoiseCancellationEnableStats(value: boolean): void;
    setOutputVolume(volume: number): void;
    setSidechainCompression(value: boolean): void;
    setSidechainCompressionStrength(strength: number): void;
    setVideoInputDevice(deviceId: string): void;
    startAecDump(): void;
    stopAecDump(): void;
    stopLocalAudioRecording(): void;
    stopRecordingRawSamples(): void;
    supported(): boolean;
    supports(value: string): boolean;
    writeAudioDebugState(): Promise<never>;
}

export class MediaEngineStore extends FluxStore {
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
    getCameraComponent(): (e: any) => any;
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
    getInputDevices(): Record<string, VideoDevice>;
    getInputVolume(): number;
    getKrispEnableStats(): boolean;
    getKrispModelOverride(): string;
    getKrispModels(): string[];
    getKrispSuppressionLevel(): number;
    getKrispVadActivationThreshold(): number;
    getLastAudioInputDeviceChangeTimestamp(): number;
    getLocalPan(key: string): Record<string, number>;
    getLocalVolume(): number;
    getLoopback(): boolean;
    getLoopbackReasons(): Set<string>;
    getMediaEngine(): MediaEngine;
    getMode(): string;
    getModeOptions(): Record<string, number | boolean>;
    getMostRecentlyRequestedVoiceFilter(): string | null;
    getNoInputDetectedNotice(): boolean;
    getNoiseCancellation(): boolean;
    getNoiseSuppression(): boolean;
    getOutputDeviceId(): string;
    getOutputDevices(): Record<string, VideoDevice>;
    getOutputVolume(): number;
    getPacketDelay(): number;
    getPreviousVoiceFilter(): string | null;
    getPreviousVoiceFilterAppliedAt(): Date | null;
    getQoS(): boolean;
    getSettings(): Record<string, any>;
    getShortcuts(): Record<string, any>;
    getSidechainCompression(): boolean;
    getSidechainCompressionStrength(): number;
    getSpeakingWhileMuted(): boolean;
    getSupportedSecureFramesProtocolVersion(): boolean;
    getSystemMicrophoneMode(): boolean;
    getUseGamescopeCapture(): boolean;
    getUseSystemScreensharePicker(): boolean;
    getUseVaapiEncoder(): boolean;
    getVideoComponent(): (e: any) => any;
    getVideoDeviceId(): string;
    getVideoDevices(): Record<string, VideoDevice>;
    getVideoHook(): boolean;
    getVideoStreamParameters(): Record<string, string | number>;
    getVideoToggleState(key: string): string;
    getVoiceFilterPlaybackEnabled(): boolean;

    goLiveSimulcastEnabled(): boolean;

    hasActiveCallKitCall(): boolean;
    hasClipsSource(): boolean;
    hasContext(key: string): boolean;
    hasH265HardwareDecode(): boolean;

    isAdvancedVoiceActivitySupported(): boolean;
    isAecDumpSupported(): boolean;
    isAnyLocalVideoAutoDisabled(): boolean;
    isAutomaticGainControlSupported(): boolean;
    isDeaf(): boolean;
    isEnableHardwareMuteNotice(): boolean;
    isEnabled(): boolean;
    isHardwareMute(): boolean;
    isInputProfileCustom(): boolean;
    isInteractionRequired(): boolean;
    isLocalMute(): boolean;
    isLocalMute(userId: string): boolean;
    isLocalVideoAutoDisabled(userId: string): boolean;
    isLocalVideoDisabled(userId: string): boolean;
    isLocalVideoDisabled(): boolean;
    isMediaFilterSettingLoading(): boolean;
    isMute(): boolean;
    isNativeAudioPermissionReady(): boolean;
    isNoiseCancellationError(): boolean;
    isNoiseCancellationSupported(): boolean;
    isNoiseSuppressionSupported(): boolean;
    isScreenSharing(): boolean;
    isSelfDeaf(): boolean;
    isSelfMute(): boolean;
    isSelfMutedTemporarily(): boolean;
    isSimulcastSupported(): boolean;
    isSoundSharing(): boolean;
    isSupported(): boolean;
    isVideoAvailable(): boolean;
    isVideoEnabled(): boolean;

    notifyMuteUnmuteSoundWasSkipped(): boolean;
    setCanHavePriority(userId: string, value: boolean): void;
    setHasActiveCallKitCall(active: boolean): void;
    shouldOfferManualSubsystemSelection(): boolean;
    shouldSkipMuteUnmuteSound(): boolean;
    showBypassSystemInputProcessing(): boolean;

    startDavePreload(): void;

    supports(e: string): boolean;
    supportsDisableLocalVideo(): boolean;
    supportsExperimentalSoundshare(): boolean;
    supportsHookSoundshare(): boolean;
    supportsInApp(appName: string): boolean;
    supportsScreenSoundshare(): boolean;
    supportsSystemScreensharePicker(): boolean;
    supportsVideoHook(): boolean;
}
