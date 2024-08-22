/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    showVoiceActivityIconInUserProfile: {
        type: OptionType.BOOLEAN,
        description: "Show user's voice activity icon in their profile",
        default: true,
    },
    showVoiceActivityIconsInLists: {
        type: OptionType.BOOLEAN,
        description: "Show user's voice activity in direct messages list and server members list",
        default: true,
    },
    showUsersInVoiceActivity: {
        type: OptionType.BOOLEAN,
        description: "Whether to show a list of users connected to a channel",
        default: true,
        disabled: () => !settings.store.showVoiceActivityIconsInLists
    },
});
