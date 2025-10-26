import { FluxStore } from "..";

export class MediaEngineStore extends FluxStore {
    isAdvancedVoiceActivitySupported(): boolean;
    isAecDumpSupported(): boolean;
    isAnyLocalVideoAutoDisabled(): boolean;
    isAutomaticGainControlSupported(): boolean;
    isDeaf(): boolean;
    isEnableHardwareMuteNotice(): boolean;
    isEnabled(): boolean;
    isExperimentalEncodersSupported(): boolean;
    isHardwareMute(): boolean;
    isInputProfileCustom(): boolean;
    isInteractionRequired(): boolean;
    isLocalMute(): boolean;
    isLocalMute(userId): boolean;
    isLocalVideoAutoDisabled(userId): boolean;
    isLocalVideoDisabled(userId): boolean;
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

    setAv1Enabled(AV1: boolean): void;
    setH265Enabled(H265: boolean): void;
    setH264Enabled(H264: boolean): void;

    getAutomaticGainControl(): boolean;
    getInputDeviceId(): string;
    getMediaEngine(): any;
    getCodecCapabilities(e: any): any;
}
