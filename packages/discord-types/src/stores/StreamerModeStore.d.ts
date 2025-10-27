import { FluxStore } from "@vencord/discord-types";

export class StreamerModeStore extends FluxStore {
    get autoToggle(): boolean;
    get disableNotifications(): boolean;
    get disableSounds(): boolean;
    get enableContentProtection(): boolean;
    get enabled(): boolean;
    get hideInstantInvites(): boolean;
    get hidePersonalInformation(): boolean;
}
