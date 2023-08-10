/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    receivedInput: {
        type: OptionType.STRING,
        description: "Input language for received messages",
        default: "auto",
        hidden: true
    },
    receivedOutput: {
        type: OptionType.STRING,
        description: "Output language for received messages",
        default: "en",
        hidden: true
    },
    sentInput: {
        type: OptionType.STRING,
        description: "Input language for sent messages",
        default: "auto",
        hidden: true
    },
    sentOutput: {
        type: OptionType.STRING,
        description: "Output language for sent messages",
        default: "en",
        hidden: true
    },
    autoTranslate: {
        type: OptionType.BOOLEAN,
        description: "Automatically translate your messages before sending. You can also shift/right click the translate button to toggle this",
        default: false
    }
});
