import { FluxStore } from "..";
import { ApplicationStreamFPS, ApplicationStreamPresets, ApplicationStreamResolutions } from "../../enums";

export interface ApplicationStreamingSettingsState {
    preset: ApplicationStreamPresets;
    resolution: ApplicationStreamResolutions;
    fps: ApplicationStreamFPS;
    soundshareEnabled: boolean;
}

export class ApplicationStreamingSettingsStore extends FluxStore {
    getState(): ApplicationStreamingSettingsState;
}
