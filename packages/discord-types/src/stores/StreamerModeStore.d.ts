import { FluxStore } from "..";

export class StreamerModeStore extends FluxStore {
    autoToggle: boolean;
    disableNotifications: boolean;
    disableSounds: boolean;
    enableContentProtection: boolean;
    enabled: boolean;
    hideInstantInvites: boolean;
    hidePersonalInformation: boolean;
}
