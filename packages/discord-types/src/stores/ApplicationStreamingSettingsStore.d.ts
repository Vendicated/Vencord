import { ApplicationStreamFPS, ApplicationStreamPresets, ApplicationStreamResolutions } from "../../enums";
import { FluxStore } from "..";

export interface ApplicationStreamingSettingsState {
    preset: ApplicationStreamPresets;
    resolution: ApplicationStreamResolutions;
    fps: ApplicationStreamFPS;
    soundshareEnabled: boolean;
}

export class ApplicationStreamingSettingsStore extends FluxStore {
    getState(): ApplicationStreamingSettingsState;
}
