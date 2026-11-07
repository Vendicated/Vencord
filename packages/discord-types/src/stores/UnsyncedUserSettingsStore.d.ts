import { FluxStore } from "..";

/** 0 = unset, 1 = off, 2 = on */
export type UseSystemThemeSetting = 0 | 1 | 2;
export type ListDensity = "auto" | "compact" | "cozy";
export type HdrDynamicRange = "no-limit" | "standard";
export type ExpressionPickerWidth = "min" | "max" | number;

export interface UnsyncedUserSettings {
    lowQualityImageMode?: boolean;
    videoUploadQuality?: string;
    dataSavingMode?: boolean;
    expressionPickerWidth?: ExpressionPickerWidth;
    messageRequestSidebarWidth?: number;
    threadSidebarWidth?: number;
    postSidebarWidth?: number;
    callChatSidebarWidth?: number;
    stageAudienceSidebarWidth?: number;
    homeSidebarWidth?: number;
    callHeaderHeight?: number;
    useSystemTheme?: UseSystemThemeSetting;
    activityPanelHeight?: number;
    disableVoiceChannelChangeAlert?: boolean;
    disableEmbeddedActivityPopOutAlert?: boolean;
    disableActivityHardwareAccelerationPrompt?: boolean;
    disableInviteWithTextChannelActivityLaunch?: boolean;
    disableHideSelfStreamAndVideoConfirmationAlert?: boolean;
    pushUpsellDismissed?: boolean;
    disableActivityHostLeftNitroUpsell?: boolean;
    disableCallUserConfirmationPrompt?: boolean;
    disableApplicationSubscriptionCancellationSurvey?: boolean;
    allowConjureRunInBackground?: boolean;
    darkSidebar?: boolean;
    saveCameraUploadsToDevice?: boolean;
    disableVisualRefresh?: boolean;
    listDensity?: ListDensity;
    hdrDynamicRange?: HdrDynamicRange;
    pauseSelfStreamPreviewWhenUnfocused?: boolean;
    videoBackground?: unknown;
}

export class UnsyncedUserSettingsStore extends FluxStore {
    getUserAgnosticState(): UnsyncedUserSettings;
    get lowQualityImageMode(): boolean;
    get videoUploadQuality(): string;
    get dataSavingMode(): boolean;
    get expressionPickerWidth(): ExpressionPickerWidth;
    get messageRequestSidebarWidth(): number;
    get threadSidebarWidth(): number;
    get postSidebarWidth(): number;
    get callChatSidebarWidth(): number;
    get stageAudienceSidebarWidth(): number;
    get homeSidebarWidth(): number;
    get callHeaderHeight(): number | undefined;
    get useSystemTheme(): UseSystemThemeSetting;
    get activityPanelHeight(): number | undefined;
    get disableVoiceChannelChangeAlert(): boolean;
    get disableEmbeddedActivityPopOutAlert(): boolean;
    get disableActivityHardwareAccelerationPrompt(): boolean;
    get disableInviteWithTextChannelActivityLaunch(): boolean;
    get disableHideSelfStreamAndVideoConfirmationAlert(): boolean;
    get pushUpsellUserSettingsDismissed(): boolean;
    get disableActivityHostLeftNitroUpsell(): boolean;
    get disableCallUserConfirmationPrompt(): boolean;
    get disableApplicationSubscriptionCancellationSurvey(): boolean;
    get allowConjureRunInBackground(): boolean;
    get darkSidebar(): boolean;
    get saveCameraUploadsToDevice(): boolean;
    /** returns fallback unless an old stored value exists */
    isVisualRefreshDisabled(fallback: boolean): boolean;
    get listDensity(): ListDensity;
    get hdrDynamicRange(): HdrDynamicRange;
    get pauseSelfStreamPreviewWhenUnfocused(): boolean;
    get videoBackground(): unknown;
}
