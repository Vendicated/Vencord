import { FluxStore } from "..";

export class ThemeStore extends FluxStore {
    theme: "light" | "dark" | "darker" | "midnight";
    darkSidebar: boolean;
    isSystemThemeAvailable: boolean;
    systemPrefersColorScheme: "light" | "dark";
    systemTheme: null;
}
