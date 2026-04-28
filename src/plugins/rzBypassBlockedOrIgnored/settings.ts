/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export default definePluginSettings({
    bypassIgnoredUsersModal: {
        type: OptionType.BOOLEAN,
        description: "Bypass the ignored users modal.",
        default: true
    },
    bypassBlockedUsersModal: {
        type: OptionType.BOOLEAN,
        description: "Bypass the blocked users modal.",
        default: true
    },
    bypassWhenJoining: {
        type: OptionType.BOOLEAN,
        description: "Bypass the modal when joining a voice channel.",
        default: true
    },
    bypassWhenUserJoins: {
        type: OptionType.BOOLEAN,
        description: "Bypass the modal when a user joins your voice channel.",
        default: true
    }
});
