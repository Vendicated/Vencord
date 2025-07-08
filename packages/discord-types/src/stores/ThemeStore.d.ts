import { FluxStore } from "..";

export type ThemePreference = "dark" | "light" | "unknown";
export type SystemTheme = "dark" | "light";
export type Theme = "light" | "dark" | "darker" | "midnight";

export interface ThemeState {
    theme: Theme;
    status: 0 | 1;
    preferences: Record<ThemePreference, Theme>;
}
export class ThemeStore extends FluxStore {
    get theme(): Theme;
    get darkSidebar(): boolean;
    get systemTheme(): SystemTheme;
    themePreferenceForSystemTheme(preference: ThemePreference): Theme;
    getState(): ThemeState;
}
