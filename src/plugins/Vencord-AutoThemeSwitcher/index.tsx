/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { StartAt } from "@utils/types";

import * as pluginSettings from "./pluginSettings";
import * as themeScheduler from "./themeScheduler";
import * as themeToggler from "./themeToggler";
import { ToggledTheme } from "./types";

const settings = pluginSettings.getPluginSettings(onChange);

let currentTheme: ToggledTheme | null = null;
let intervalHandle: NodeJS.Timeout | null = null;
let pluginStarted: boolean = false;

function onChange() {
    if (pluginStarted) {
        updateTheme();
    }
}

function updateTheme() {
    const expectedTheme = themeScheduler.getExpectedTheme(settings.store.lightThemeStartTime, settings.store.darkThemeStartTime);
    const discordTheme = expectedTheme === ToggledTheme.Dark ? settings.store.darkTheme : settings.store.lightTheme;
    const customCssURLs = expectedTheme === ToggledTheme.Dark ? settings.store.darkThemeURLs : settings.store.lightThemeURLs;

    themeToggler.changeDiscordTheme(discordTheme as string);
    if (customCssURLs) {
        themeToggler.changeCustomCssUrls(customCssURLs);
    }

    currentTheme = expectedTheme;
}

function periodicThemeUpdateCheck() {
    const expectedTheme = themeScheduler.getExpectedTheme(settings.store.lightThemeStartTime, settings.store.darkThemeStartTime);
    if (expectedTheme !== currentTheme) {
        updateTheme();
    }
}

export default definePlugin({
    name: "تغير ثيم الدسكورد",
    description: "Automatically switches between themes based on the time of day",
    authors:  [{
        name: "rz30",
        id: 786315593963536415n
    }],
    settings,
    startAt: StartAt.WebpackReady,
    start() {
        updateTheme();
        intervalHandle = setInterval(periodicThemeUpdateCheck, 60000);
        pluginStarted = true;
    },
    stop() {
        if (intervalHandle !== null) {
            clearInterval(intervalHandle);
            intervalHandle = null;
        }
        currentTheme = null;
        pluginStarted = false;
    }
});
