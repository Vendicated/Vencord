/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants.js";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findLazy } from "@webpack";
import { FluxDispatcher, Forms, Toasts, UserStore } from "@webpack/common";

// the plugin uses -1 as a fallback for no client theme. discord doesn't
interface PreferredTheme {
    light: number;
    dark: number;
}

let nextChange: NodeJS.Timeout;

const PreloadedUserSettings = findLazy(m => m.ProtoClass?.typeName?.includes("PreloadedUserSettings"));
const Themes: Record<number, string> = findLazy(m => m[16] === "EASTER_EGG");
const updateTheme: (gah: { theme: "light" | "dark", backgroundGradientPresetId?: number; }) => Promise<void> = findByCodeLazy("clientThemeSettings:{");

const getBasicTheme = () =>
    PreloadedUserSettings.getCurrentValue().appearance.theme === 1 ? "dark" : "light";
const getClientThemeId = () =>
    PreloadedUserSettings.getCurrentValue().appearance.clientThemeSettings?.backgroundGradientPresetId?.value as number ?? -1;
const canUseClientThemes = () =>
    Vencord.Plugins.isPluginEnabled("FakeNitro") || (UserStore.getCurrentUser().premiumType ?? 0) === 2;
function updateThemeIfNecessary(theme: string) {
    const currentTheme = getBasicTheme();
    const themeId = settings.store.preferredTheme[theme];
    if (
        (theme === "light" && currentTheme === "dark")
        || (theme === "dark" && currentTheme === "light")
    ) updateTheme({
        theme,
        backgroundGradientPresetId: canUseClientThemes() ? themeId === -1 ? undefined : themeId : undefined
    });
}
// hh:mm to unix timestamp
function toAdjustedTimestamp(t: string): number {
    const [hours, minutes] = t.split(":").map(i => i && parseInt(i, 10));
    return new Date().setHours(hours as number, minutes || 0, 0, 0);
}
function showError() {
    Toasts.show({
        message: "TimedLightTheme - Invalid settings",
        id: Toasts.genId(),
        type: Toasts.Type.FAILURE,
        options: {
            duration: 3000,
            position: Toasts.Position.BOTTOM
        }
    });
}
const snakeToTitleCase = (text: string) =>
    text.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

function DisplayThemeComponent() {
    const { light, dark }: PreferredTheme = settings.store.preferredTheme;
    return <>
        <Forms.FormTitle>Preferred Themes</Forms.FormTitle>
        {canUseClientThemes()
            ? <Forms.FormText variant="text-md/bold">
                Light: {snakeToTitleCase(light === -1 ? "default" : Themes[light])} -
                Dark: {snakeToTitleCase(dark === -1 ? "default" : Themes[dark])}
            </Forms.FormText>
            : <Forms.FormText variant="text-md/bold">
                Can't use nitro client themes. Restart Discord if this is wrong
            </Forms.FormText>
        }
    </>;
}

const settings = definePluginSettings({
    start: {
        description: "When to enter light mode (24-hour time)",
        type: OptionType.STRING,
        default: "08:00",
        placeholder: "xx:xx",
        isValid: t => /^\d{0,2}(?::\d{0,2})?$/.test(t),
        onChange: () => Vencord.Plugins.isPluginEnabled("TimedLightTheme") && (Vencord.Plugins.plugins.TimedLightTheme as any).checkForUpdate(),
    },
    end: {
        description: "When to enter dark mode (24-hour time)",
        type: OptionType.STRING,
        default: "20:00",
        placeholder: "xx:xx",
        isValid: t => /^\d{0,2}(?::\d{0,2})?$/.test(t),
        onChange: () => Vencord.Plugins.isPluginEnabled("TimedLightTheme") && (Vencord.Plugins.plugins.TimedLightTheme as any).checkForUpdate(),
    },
    preferredTheme: {
        description: "Store which theme to use for light and dark mode",
        type: OptionType.COMPONENT,
        component: DisplayThemeComponent
    },
});

export default definePlugin({
    name: "TimedLightTheme",
    authors: [Devs.TheSun],
    description: "Automatically enables/disables light theme based on the time of day",
    settings,

    checkForUpdate() {
        const { start, end } = settings.store;
        if (!start || !end)
            return showError();

        const startTimestamp = toAdjustedTimestamp(start);
        const endTimestamp = toAdjustedTimestamp(end);
        if (startTimestamp >= endTimestamp)
            return showError();

        const now = Date.now();

        const themeId = getClientThemeId();
        if (!settings.store.preferredTheme) {
            const theme = getBasicTheme();
            settings.store.preferredTheme = {
                light: theme === "light" ? themeId : -1,
                dark: theme === "dark" ? themeId : -1
            };
        }

        if (now < startTimestamp) {
            updateThemeIfNecessary("dark");
            nextChange = setTimeout(() => this.checkForUpdate(), startTimestamp - now);
        }
        else if (now >= startTimestamp && now <= endTimestamp) {
            updateThemeIfNecessary("light");
            nextChange = setTimeout(() => this.checkForUpdate(), endTimestamp - now);
        }
        else if (now > endTimestamp) {
            updateThemeIfNecessary("dark");
            nextChange = setTimeout(() => this.checkForUpdate(), (startTimestamp + 86400_000) - now);
        }
    },

    updatePreferredThemes(e) {
        const newTheme = e?.changes?.appearance?.settings as {
            theme?: "light" | "dark", // undefined means system theme
            clientThemeSettings: {
                backgroundGradientPresetId?: number;
            };
        };
        if (!newTheme?.theme) return;
        settings.store.preferredTheme[newTheme.theme] = newTheme.clientThemeSettings.backgroundGradientPresetId ?? -1;
    },

    start() {
        FluxDispatcher.subscribe("SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE", this.updatePreferredThemes);
        this.checkForUpdate();
    },

    stop() {
        FluxDispatcher.unsubscribe("SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE", this.updatePreferredThemes);
        clearTimeout(nextChange);
    },
});
