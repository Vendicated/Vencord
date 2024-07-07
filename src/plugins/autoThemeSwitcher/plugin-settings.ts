/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { proxyLazy } from "@utils/lazy";
import { classes } from "@utils/misc";
import { OptionType } from "@utils/types";
import { findLazy } from "@webpack";

import * as themeLister from "./theme-lister";
import * as themeScheduler from "./theme-scheduler";
import { ToggledTheme } from "./theme-types";

const TextAreaProps = findLazy(m => typeof m.textarea === "string");

export function getPluginSettings(onChange: () => void) {
    return definePluginSettings({
        lightThemeStartTime: {
            description: "Light Theme Start Time (HH:MM)",
            type: OptionType.STRING,
            default: "08:00",
            isValid: (newValue: string) => newValue.match(themeScheduler.timeRegex) !== null,
            onChange
        },
        lightTheme: {
            description: "Light Theme",
            type: OptionType.SELECT,
            options: proxyLazy(() => themeLister.getSelectOptions(ToggledTheme.Light)),
            onChange
        },
        lightThemeURLs: {
            description: "Light Theme CSS URLs (1 per line)",
            type: OptionType.STRING_MULTILINE,
            default: "",
            placeholder: "Do not change",
            onChange,
            componentProps: proxyLazy(() => ({
                rows: 5,
                className: classes(TextAreaProps.textarea, "vc-settings-theme-links")
            }))
        },
        darkThemeStartTime: {
            description: "Dark Theme Start Time (HH:MM)",
            type: OptionType.STRING,
            default: "20:00",
            isValid: (newValue: string) => newValue.match(themeScheduler.timeRegex) !== null,
            onChange
        },
        darkTheme: {
            description: "Dark Theme",
            type: OptionType.SELECT,
            options: proxyLazy(() => themeLister.getSelectOptions(ToggledTheme.Dark)),
            onChange
        },
        darkThemeURLs: {
            description: "Dark Theme CSS URLs (1 per line)",
            type: OptionType.STRING_MULTILINE,
            default: "",
            placeholder: "Do not change",
            onChange,
            componentProps: proxyLazy(() => ({
                rows: 5,
                className: classes(TextAreaProps.textarea, "vc-settings-theme-links")
            }))
        },
    });
}
