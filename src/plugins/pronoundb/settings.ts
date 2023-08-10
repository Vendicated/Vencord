/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { PronounsFormat, PronounSource } from "./pronoundbUtils";

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
    pronounSource: {
        type: OptionType.SELECT,
        description: "Where to source pronouns from",
        options: [
            {
                label: "Prefer PronounDB, fall back to Discord",
                value: PronounSource.PreferPDB,
                default: true
            },
            {
                label: "Prefer Discord, fall back to PronounDB (might lead to inconsistency between pronouns in chat and profile)",
                value: PronounSource.PreferDiscord
            }
        ]
    },
    showSelf: {
        type: OptionType.BOOLEAN,
        description: "Enable or disable showing pronouns for the current user",
        default: true
    },
    showInMessages: {
        type: OptionType.BOOLEAN,
        description: "Show in messages",
        default: true
    },
    showInProfile: {
        type: OptionType.BOOLEAN,
        description: "Show in profile",
        default: true
    }
});
