/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    autoEncode: {
        type: OptionType.BOOLEAN,
        description: "Automatically encrypt all outgoing messages before sending. Each message is encrypted with a unique random key and formatted to appear as normal chat, helping bypass automated link filtering.",
        default: false
    },
    showEncodedTooltip: {
        type: OptionType.BOOLEAN,
        description: "Display a brief tooltip notification when a message is automatically encrypted, confirming the encryption was applied.",
        default: true
    },
    stealthMode: {
        type: OptionType.BOOLEAN,
        description: "Use emoji-based formatting (🔐... | 🗝️...) instead of explicit 'encrypted:' labels. This subtle format is less likely to be detected by automated filtering systems.",
        default: true
    }
}).withPrivateSettings<{
    showAutoEncodeAlert: boolean;
}>();
