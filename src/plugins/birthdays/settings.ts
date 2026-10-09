/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { SettingsPanel } from "./components/SettingsPanel"; 
import { Birthday } from "./types";

export const settings = definePluginSettings({
    panel: {
        type: OptionType.COMPONENT,
        component: SettingsPanel
    },
    notifyOnDay: {
        type: OptionType.BOOLEAN,
        description: "Notify you on the day of someone's birthday",
        default: true
    },
    reminderDays: {
        type: OptionType.SLIDER,
        description: "Also remind you this many days in advance (0 to disable)",
        markers: [0, 1, 2, 3, 5, 7, 14],
        default: 3,
        stickToMarkers: true
    },
    showInProfile: {
        type: OptionType.BOOLEAN,
        description: "Show a birthday row in user profiles",
        default: true, 
        restartNeeded: true
    },
    showNavButton: {
        type: OptionType.BOOLEAN,
        description: "Show the birthday calendar entry in the direct messages sidebar",
        default: true,
        restartNeeded: true
    },

    birthdays: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, Record<string, Birthday>>
    },
    notifiedOn: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, Record<string, string>>
    }
});