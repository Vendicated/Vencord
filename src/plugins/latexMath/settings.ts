/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 watchthelight
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    enableBlockMath: {
        type: OptionType.BOOLEAN,
        description: "Render $$...$$ as display (block) math",
        default: true,
    },
    enableInlineMath: {
        type: OptionType.BOOLEAN,
        description: "Render $...$ as inline math (may conflict with currency symbols)",
        default: false,
    },
    cdnUrl: {
        type: OptionType.STRING,
        description: "Custom KaTeX CDN base URL (leave blank for default)",
        default: "",
    },
});
