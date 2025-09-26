/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";


export const settings = definePluginSettings({
    justUseCustomTheme: {
        type: OptionType.BOOLEAN,
        description: "If enabled, only switch between light and dark mode without changing the selected theme colors. (best with custom themes)",
        default: false
    },

    lightMode: {
        type: OptionType.SELECT,
        description: "Theme to use when the system is in Light Mode.",
        options: [
            { label: "Mint Apple", value: 0, default: true },
            { label: "Citrus Sherbert", value: 1 },
            { label: "Retro Raincloud", value: 2 },
            { label: "Hanami", value: 3 },
            { label: "Sunrise", value: 4 },
            { label: "Candyfloss", value: 5 },
            { label: "LoFi Vibes", value: 6 },
            { label: "Desert Khaki", value: 7 }
        ]
    },

    darkMode: {
        type: OptionType.SELECT,
        description: "Theme to use when the system is in Dark Mode.",
        options: [
            { label: "Sunset", value: 8, default: true },
            { label: "Chroma Glow", value: 9 },
            { label: "Forest", value: 10 },
            { label: "Crimson Moon", value: 11 },
            { label: "Midnight Blurple", value: 12 },
            { label: "Mars", value: 13 },
            { label: "Dusk", value: 14 },
            { label: "Under the Sea", value: 15 },
            { label: "Retro Storm", value: 17 },
            { label: "Neon Nights", value: 18 },
            { label: "Strawberry Lemonade", value: 20 },
            { label: "Aurora", value: 21 },
            { label: "Sepia", value: 19 },
            { label: "Blurple Twilight", value: 22 }
        ]
    },
});

export default definePlugin({
    name: "AutoSystemTheme",
    description: "Automatically switch Discord theme based on system theme",
    authors: [Devs.MahiroX36],
    dependencies: ["UserSettingsAPI"],
    settings,

    start() {
        this._mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this._applyTheme = () => {
            const isDark = this._mediaQuery.matches;
            if (!this.settings.store.justUseCustomTheme) {
                FluxDispatcher.dispatch({
                    type: "UPDATE_BACKGROUND_GRADIENT_PRESET",
                    presetId: isDark ? this.settings.store.darkMode : this.settings.store.lightMode
                });
            }
            FluxDispatcher.dispatch({
                type: "SET_THEME_OVERRIDE",
                theme: isDark ? "dark" : "light"
            });

        };

        this._mediaQuery.addEventListener("change", this._applyTheme);
        this._applyTheme();
    },

    stop() {
        this._mediaQuery?.removeEventListener("change", this._applyTheme);
    }


});
