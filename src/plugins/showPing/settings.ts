/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    showNearbyConnectionStatus: {
        type: OptionType.BOOLEAN,
        description: "Show ping nearby connection status.",
        default: false
    },
    showUnderConnectionIcon: {
        type: OptionType.BOOLEAN,
        description: "Show ping under connection icon.",
        default: true
    },
});
