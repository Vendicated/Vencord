/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { proxyLazy } from "@utils/lazy";
import { classes } from "@utils/misc";
import { OptionType, SettingsDefinition } from "@utils/types";
import { findLazy } from "@webpack";

import * as themeLister from "./themeLister";
import { ToggledTheme } from "./types";

const TextAreaProps = findLazy(m => typeof m.textarea === "string");

function getToggledThemeSettings(theme: ToggledTheme, onChange: () => void): SettingsDefinition {
    const themeName = theme === ToggledTheme.Light ? "Light Theme" : "Dark Theme";

    return {
        themeStartTime: {
            description: `${themeName} Start Time (HH:MM)`,
            type: OptionType.STRING,
            default: theme === ToggledTheme.Light ? "08:00" : "20:00",
            onChange
        },
        theme: {
            description: themeName,
            type: OptionType.SELECT,
            options: proxyLazy(() => themeLister.getSelectOptions(theme)),
            onChange
        },
        themeURLs: {
            description: `${themeName} CSS URLs (1 per line)`,
            type: OptionType.STRING_MULTILINE,
            default: "",
            placeholder: "Do not change",
            onChange,
            componentProps: proxyLazy(() => ({
                rows: 5,
                className: classes(TextAreaProps.textarea, "vc-settings-theme-links")
            }))
        },
    };
}

const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;

function regexValidateCheck() {
    return {
        isValid: (newValue: string) => newValue.match(timeRegex) !== null
    };
}

export function getPluginSettings(onChange: () => void) {
    const lightThemeSettings = getToggledThemeSettings(ToggledTheme.Light, onChange);
    const darkThemeSettings = getToggledThemeSettings(ToggledTheme.Dark, onChange);


    return definePluginSettings({
        lightThemeStartTime: lightThemeSettings.themeStartTime,
        lightTheme: lightThemeSettings.theme,
        lightThemeURLs: lightThemeSettings.themeURLs,
        darkThemeStartTime: darkThemeSettings.themeStartTime,
        darkTheme: darkThemeSettings.theme,
        darkThemeURLs: darkThemeSettings.themeURLs,
    }, {
        lightThemeStartTime: regexValidateCheck(),
        darkThemeStartTime: regexValidateCheck(),
    });
}
