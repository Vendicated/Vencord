import { FluxStore } from "..";

/** 0 unknown, 1 active, 2 mono output, 3 init failed, 4 HRTF failed */
export type SpatialAudioStatus = 0 | 1 | 2 | 3 | 4;

export interface SpatialAudioAbsorption {
    low: number;
    mid: number;
    high: number;
}

export interface SpatialAudioSurface {
    absorption: SpatialAudioAbsorption;
    scattering: number;
}

export interface SpatialAudioOptions {
    isSpatial: boolean;
    limiterEnabled: boolean;
    binaural: {
        spatialBlend: number;
        bilinearInterpolation: boolean;
        hrtfVolume: number;
        hrtfNormalization: boolean;
        hrtfFile: string;
    };
    distanceAttenuation: {
        enabled: boolean;
        minDistance: number;
    };
    airAbsorption: {
        enabled: boolean;
        coefficients: SpatialAudioAbsorption;
    };
    reflections: {
        enabled: boolean;
        durationSeconds: number;
        numRays: number;
        numBounces: number;
        irradianceMinDistance: number;
        binauralDecode: boolean;
        mixLevel: number;
        room: {
            minCorner: { x: number; y: number; z: number; };
            maxCorner: { x: number; y: number; z: number; };
            floor: SpatialAudioSurface;
            ceiling: SpatialAudioSurface;
            walls: SpatialAudioSurface;
        };
    };
}

export interface SpatialAudioState {
    enabled?: boolean;
}

export class SpatialAudioStore extends FluxStore {
    getUserAgnosticState(): SpatialAudioState;
    isSpatialAudioEnabled(): boolean;
    isSpatialAudioActive(): boolean;
    getActiveSpatialAudioOptions(): SpatialAudioOptions;
    /** deep-merged over the default options */
    getSpatialAudioOverrides(): Partial<SpatialAudioOptions>;
    getSpatialAudioStatus(): SpatialAudioStatus;
}
