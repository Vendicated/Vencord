/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const enum PronounsFormat {
    Lowercase = "LOWERCASE",
    Capitalized = "CAPITALIZED"
}

export const settings = definePluginSettings({
    pronounsFormat: {
        type: OptionType.SELECT,
        description: "The format for pronouns to appear in chat",
        options: [
            {
                label: "Lowercase",
                value: PronounsFormat.Lowercase,
                default: true
            },
            {
                label: "Capitalized",
                value: PronounsFormat.Capitalized
            }
        ]
    },
    showSelf: {
        type: OptionType.BOOLEAN,
        description: "Enable or disable showing pronouns for yourself",
        default: true
    }
});
