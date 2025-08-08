import { FluxStore } from "..";

export class MediaEngineStore extends FluxStore {
    isSelfMute(): boolean;
    isSelfDeaf(): boolean;

    setAv1Enabled(AV1: boolean): void;
    setH265Enabled(H265: boolean): void;
    setH264Enabled(H264: boolean): void;

    getAutomaticGainControl(): boolean;
    getInputDeviceId(): string;
    getMediaEngine(): any;
    getCodecCapabilities(e: any): any;
}
