/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    noiseSuppression: {
        type: OptionType.BOOLEAN,
        description: "Noise Suppression",
        default: true,
    },
    echoCancellation: {
        type: OptionType.BOOLEAN,
        description: "Echo Cancellation",
        default: true,
    },
});
