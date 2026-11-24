import { FluxStore } from "..";

export interface ApplicationStreamingSettings {
    /** 1 video, 2 documents, 3 custom, 4 auto. */
    preset: number;
    /** stream height in pixels. 0 is the source resolution. */
    resolution: number;
    /** frame rate in fps. */
    fps: number;
    /** whether the stream includes audio. */
    soundshareEnabled: boolean;
}

export interface ApplicationStreamingSettingsStore extends FluxStore {
    getState(): ApplicationStreamingSettings;
}
