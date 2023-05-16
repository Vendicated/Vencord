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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { wordsFromSnake, wordsToTitle } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Forms, PreloadedUserSettings, Toasts, UserStore } from "@webpack/common";

import { isPluginEnabled } from "./index.js";

// the plugin uses -1 as a fallback for no client theme. discord doesn't
interface PreferredTheme {
    light: number;
    dark: number;
}

let nextChange: NodeJS.Timeout;

const Themes = findByPropsLazy("MINT_APPLE", "CRIMSON_MOON") as Record<number, string>;
const updateTheme = findByCodeLazy("clientThemeSettings:{") as (data: { theme: "light" | "dark", backgroundGradientPresetId?: number; }) => Promise<void>;

const getBasicTheme = () =>
    PreloadedUserSettings.getCurrentValue().appearance.theme === 1 ? "dark" : "light";
const getClientThemeId = () =>
    PreloadedUserSettings.getCurrentValue().appearance.clientThemeSettings?.backgroundGradientPresetId?.value as number ?? -1;

const canActuallyUseClientThemes = () =>
    UserStore.getCurrentUser().premiumType === 2;
const canUseClientThemes = () =>
    isPluginEnabled("FakeNitro") || canActuallyUseClientThemes();

const snakeToTitleCase = t => wordsToTitle(wordsFromSnake(t));

function updateThemeIfNecessary(theme: string) {
    const currentTheme = getBasicTheme();
    const themeId = settings.store.preferredTheme[theme];
    if (
        (theme === "light" && currentTheme === "dark")
        || (theme === "dark" && currentTheme === "light")
    ) {
        const canUseThemes = canUseClientThemes();
        updateTheme({
            theme,
            backgroundGradientPresetId: canUseThemes && themeId !== -1 ? themeId : undefined
        });
        // if you update a fake client theme, settings aren't synced at all
        // so while you update to a light theme, discord still thinks you are using a dark one.
        if (themeId && canUseThemes && !canActuallyUseClientThemes()) updateTheme({ theme });
    }
}
// hh:mm to unix timestamp
function toAdjustedTimestamp(t: string): number {
    const [hours, minutes] = t.split(":").map(i => i && parseInt(i, 10));
    return new Date().setHours(hours as number, minutes || 0, 0, 0);
}
function showError(error: string) {
    Toasts.show({
        message: `TimedLightTheme - ${error}`,
        id: Toasts.genId(),
        type: Toasts.Type.FAILURE,
        options: {
            duration: 3000,
            position: Toasts.Position.BOTTOM
        }
    });
}

function updatePreferredThemes(e) {
    const newTheme = e?.changes?.appearance?.settings as {
        theme?: "light" | "dark", // undefined means system theme
        clientThemeSettings: {
            backgroundGradientPresetId?: number;
        };
    };
    if (!newTheme?.theme) return;
    settings.store.preferredTheme[newTheme.theme] = newTheme.clientThemeSettings.backgroundGradientPresetId ?? -1;
}

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

function checkForUpdate() {
    const { start, end } = settings.store;
    if (!start || !end)
        return showError("Missing start or end time");

    const startTimestamp = toAdjustedTimestamp(start);
    const endTimestamp = toAdjustedTimestamp(end);
    if (startTimestamp >= endTimestamp)
        return showError("Start time higher than end time");

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
        // |--x-|------------|----| 🌑 -> check for update once the day begins
        updateThemeIfNecessary("dark");
        nextChange = setTimeout(() => checkForUpdate(), startTimestamp - now);
    }
    else if (now >= startTimestamp && now <= endTimestamp) {
        // |----|---x--------|----| 🔆 -> check for update once the day ends
        updateThemeIfNecessary("light");
        nextChange = setTimeout(() => checkForUpdate(), endTimestamp - now);
    }
    else if (now > endTimestamp) {
        // |----|------------|-x--| 🌑 -> check for update once the next day begins
        updateThemeIfNecessary("dark");
        nextChange = setTimeout(() => checkForUpdate(), (startTimestamp + 86_400_000) - now);
    }
}

const settings = definePluginSettings({
    start: {
        description: "When to enter light mode (24-hour time)",
        type: OptionType.STRING,
        default: "08:00",
        placeholder: "xx:xx",
        isValid: t => /^\d{0,2}(?::\d{0,2})?$/.test(t),
        onChange: () => isPluginEnabled("TimedLightTheme") && checkForUpdate(),
    },
    end: {
        description: "When to enter dark mode (24-hour time)",
        type: OptionType.STRING,
        default: "20:00",
        placeholder: "xx:xx",
        isValid: t => /^\d{0,2}(?::\d{0,2})?$/.test(t),
        onChange: () => isPluginEnabled("TimedLightTheme") && checkForUpdate(),
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

    flux: {
        SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE: updatePreferredThemes
    },

    start() {
        checkForUpdate();
    },

    stop() {
        clearTimeout(nextChange);
    },
});
