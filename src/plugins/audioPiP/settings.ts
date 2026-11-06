/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const Corners = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
export type Corner = typeof Corners[number];

export const settings = definePluginSettings({
    alwaysShow: {
        type: OptionType.BOOLEAN,
        description: "Show the floating player even while the original player is on screen, and keep paused or finished tracks when their message scrolls away",
        default: false
    }
}).withPrivateSettings<{
    scale?: number;
    corner?: Corner;
}>();
