/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

const PLUGIN_NAME = "ShowDevBanner";
const LEGACY_SETTINGS_ID = "devBanner";

export const settings = definePluginSettings({
    removeCloseButton: {
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
        restartNeeded: true,
        description: "Remove dev banner close button",
    },
});

migratePluginSettings(PLUGIN_NAME, LEGACY_SETTINGS_ID);
