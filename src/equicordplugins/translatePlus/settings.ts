/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    target: {
        type: OptionType.STRING,
        description: "Target language",
        default: "en",
        restartNeeded: true
    },
    toki: {
        type: OptionType.BOOLEAN,
        description: "Enable Toki Pona",
        default: true,
        restartNeeded: true
    },
    sitelen: {
        type: OptionType.BOOLEAN,
        description: "Enable Sitelen Pona",
        default: true,
        restartNeeded: true
    },
    shavian: {
        type: OptionType.BOOLEAN,
        description: "Enable Shavian",
        default: true,
        restartNeeded: true
    }
});
