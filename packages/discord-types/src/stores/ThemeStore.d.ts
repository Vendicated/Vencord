import { FluxStore } from "..";

export type ThemePreference = "dark" | "light" | "unknown";
export type SystemTheme = "dark" | "light";
export type Theme = "light" | "dark" | "darker" | "midnight";

export interface ThemeState {
    theme: Theme;
    /** 0 = not loaded, 1 = loaded */
    status: 0 | 1;
    preferences: Record<ThemePreference, Theme>;
}
export class ThemeStore extends FluxStore {
    get systemTheme(): SystemTheme;
    get theme(): Theme;

    getState(): ThemeState;
    themePreferenceForSystemTheme(preference: ThemePreference): Theme;
}
