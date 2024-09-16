/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { OptionType } from "@utils/types";
import definePlugin from "@utils/types";

// Define plugin settings with day and night time
const settings = definePluginSettings({
    dayTime: {
        type: OptionType.NUMBER,
        description: "Day Theme Start Time (Hour)",
        default: 8, // Default: 8 AM
        isValid: value => value >= 0 && value <= 23 || "Must be a valid hour (0-23)"
    },
    nightTime: {
        type: OptionType.NUMBER,
        description: "Night Theme Start Time (Hour)",
        default: 20, // Default: 8 PM
        isValid: value => value >= 0 && value <= 23 || "Must be a valid hour (0-23)"
    }
});

function setTheme(theme: "light" | "dark") {
    const { body } = document;
    if (theme === "light") {
        body.classList.remove("theme-dark");
        body.classList.add("theme-light");
    } else {
        body.classList.remove("theme-light");
        body.classList.add("theme-dark");
    }
}

// Function to apply light or dark theme based on current time
function applyThemeBasedOnTime() {
    const currentHour = new Date().getHours();
    const { dayTime, nightTime } = settings.store;

    if (currentHour >= dayTime && currentHour < nightTime) {
        setTheme("light");
    } else {
        setTheme("dark");
    }
}

// Start and stop logic
function startPlugin() {
    applyThemeBasedOnTime();
    setInterval(applyThemeBasedOnTime, 3600000); // Check every hour
}

function stopPlugin() {
    // Optionally reset to user's original theme (not implemented yet)
}

// Plugin export with metadata and settings
export default definePlugin({
    name: "DayNight Switcher",
    description: "Automatically switches between Discord's light and dark themes based on time.",
    authors: [Devs.Migu],
    settings,
    start: startPlugin,
    stop: stopPlugin
});
