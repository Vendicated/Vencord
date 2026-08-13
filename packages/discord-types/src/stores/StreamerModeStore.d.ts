import { FluxStore } from "..";

export interface StreamerModeSettings {
    enabled: boolean;
    autoToggle: boolean;
    hideInstantInvites: boolean;
    hidePersonalInformation: boolean;
    disableSounds: boolean;
    disableNotifications: boolean;
    enableContentProtection: boolean;
}

export class StreamerModeStore extends FluxStore {
    get autoToggle(): boolean;
    get disableNotifications(): boolean;
    get disableSounds(): boolean;
    get enableContentProtection(): boolean;
    get enabled(): boolean;
    get hideInstantInvites(): boolean;
    get hidePersonalInformation(): boolean;

    getSettings(): StreamerModeSettings;
    getState(): Record<string, StreamerModeSettings>;
}
