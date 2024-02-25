/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    nitroFirst: {
        description: "Show Nitro banner first? (only if present)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    memberList: {
        description: "Show banner in member list?",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    dmList: {
        description: "Show banner in DM list?",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    voiceBanner: {
        description: "Use your banner as voice chat background?",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    localBanner: {
        description: "Use local banner?",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    localBannerURL: {
        description: "URL for local banner",
        type: OptionType.STRING,
        restartNeeded: false
    }
});
