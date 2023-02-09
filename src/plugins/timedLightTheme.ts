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
import { findByPropsLazy, findLazy } from "@webpack";
import { Toasts } from "@webpack/common";

const PreloadedUserSettings = findLazy(m => m.ProtoClass?.typeName?.includes("PreloadedUserSettings"));
const getTheme = () => PreloadedUserSettings.getCurrentValue().appearance.theme === 1 ? "dark" : "light";
const updateTheme: { updateTheme: (theme: "light" | "dark") => Promise<void>; } = findByPropsLazy("updateTheme");
function updateThemeIfNecessary(theme: "light" | "dark") {
    const currentTheme = getTheme();
    if (
        (theme === "light" && currentTheme === "dark")
        || (theme === "dark" && currentTheme === "light")
    ) updateTheme.updateTheme(theme);
}
let nextChange: NodeJS.Timeout;

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
            duration: 1500,
            position: Toasts.Position.BOTTOM
        }
    });
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
});

export default definePlugin({
    name: "TimedLightTheme",
    authors: [Devs.TheSun],
    description: "Automatically enables/disables light theme based on the time of day",
    settings,

    checkForUpdate() {
        const { start, end } = settings.store;
        if (!start || !end) {
            return showError();
        }

        const startTimestamp = toAdjustedTimestamp(start);
        const endTimestamp = toAdjustedTimestamp(end);
        if (startTimestamp >= endTimestamp) {
            return showError();
        }
        const now = Date.now();

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

    start() {
        this.checkForUpdate();
    },

    stop() {
        clearTimeout(nextChange);
    },
});
