import { FluxStore } from "..";

export type DesktopNotificationType = "ALL" | "ONLY_MENTIONS" | "NEVER";
export type TTSNotificationType = "ALL" | "ONLY_MENTIONS" | "NEVER";

export interface NotificationSettingsState {
    desktopType: DesktopNotificationType;
    disableAllSounds: boolean;
    disabledSounds: string[];
    ttsType: TTSNotificationType;
    disableUnreadBadge: boolean;
    taskbarFlash: boolean;
    notifyMessagesInSelectedChannel: boolean;
}

export class NotificationSettingsStore extends FluxStore {
    get taskbarFlash(): boolean;
    getUserAgnosticState(): NotificationSettingsState;
    getDesktopType(): DesktopNotificationType;
    getTTSType(): TTSNotificationType;
    getDisabledSounds(): string[];
    getDisableAllSounds(): boolean;
    getDisableUnreadBadge(): boolean;
    getNotifyMessagesInSelectedChannel(): boolean;
    isSoundDisabled(sound: string): boolean;
}
