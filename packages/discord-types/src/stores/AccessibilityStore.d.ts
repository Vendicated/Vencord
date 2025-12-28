import { FluxStore } from "..";

export type ReducedMotionPreference = "auto" | "reduce" | "no-preference";
export type ForcedColorsPreference = "none" | "active";
export type ContrastPreference = "no-preference" | "more" | "less" | "custom";
export type RoleStyle = "username" | "dot" | "hidden";

export interface AccessibilityState {
    fontSize: number;
    zoom: number;
    keyboardModeEnabled: boolean;
    contrastMode: string;
    colorblindMode: boolean;
    lowContrastMode: boolean;
    saturation: number;
    contrast: number;
    desaturateUserColors: boolean;
    forcedColorsModalSeen: boolean;
    keyboardNavigationExplainerModalSeen: boolean;
    messageGroupSpacing: number | null;
    systemPrefersReducedMotion: ReducedMotionPreference;
    systemPrefersCrossfades: boolean;
    prefersReducedMotion: ReducedMotionPreference;
    systemForcedColors: ForcedColorsPreference;
    syncForcedColors: boolean;
    systemPrefersContrast: ContrastPreference;
    alwaysShowLinkDecorations: boolean;
    roleStyle: RoleStyle;
    displayNameStylesEnabled: boolean;
    submitButtonEnabled: boolean;
    syncProfileThemeWithUserTheme: boolean;
    enableCustomCursor: boolean;
    switchIconsEnabled: boolean;
}

export class AccessibilityStore extends FluxStore {
    get fontScale(): number;
    get fontSize(): number;
    get isFontScaledUp(): boolean;
    get isFontScaledDown(): boolean;
    get fontScaleClass(): string;
    get zoom(): number;
    get isZoomedIn(): boolean;
    get isZoomedOut(): boolean;
    get keyboardModeEnabled(): boolean;
    get colorblindMode(): boolean;
    get lowContrastMode(): boolean;
    get saturation(): number;
    get contrast(): number;
    get desaturateUserColors(): boolean;
    get forcedColorsModalSeen(): boolean;
    get keyboardNavigationExplainerModalSeen(): boolean;
    get messageGroupSpacing(): number;
    get isMessageGroupSpacingIncreased(): boolean;
    get isMessageGroupSpacingDecreased(): boolean;
    get isSubmitButtonEnabled(): boolean;
    get syncProfileThemeWithUserTheme(): boolean;
    get systemPrefersReducedMotion(): ReducedMotionPreference;
    get rawPrefersReducedMotion(): ReducedMotionPreference;
    get useReducedMotion(): boolean;
    get systemForcedColors(): ForcedColorsPreference;
    get syncForcedColors(): boolean;
    get useForcedColors(): boolean;
    get systemPrefersContrast(): ContrastPreference;
    get systemPrefersCrossfades(): boolean;
    get alwaysShowLinkDecorations(): boolean;
    get enableCustomCursor(): boolean;
    get roleStyle(): RoleStyle;
    get displayNameStylesEnabled(): boolean;
    get isHighContrastModeEnabled(): boolean;
    get isSwitchIconsEnabled(): boolean;
    getUserAgnosticState(): AccessibilityState;
}
