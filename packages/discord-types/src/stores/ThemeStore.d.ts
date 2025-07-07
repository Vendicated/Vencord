import { FluxStore } from "..";

export type SystemTheme = "dark" | "light" | "unknown";

export class ThemeStore extends FluxStore {
    get theme(): "light" | "dark" | "darker" | "midnight";
    get darkSidebar(): boolean;
    get systemTheme(): SystemTheme;
    themePreferenceForSystemTheme(systemTheme: SystemTheme): "darker" | "light";
}
