/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { SettingsChannelsManager } from "@plugins/sevenTVEmotes/components/channelsManager";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    channels: {
        type: OptionType.CUSTOM,
        default: "",
    },
    channelsManager: {
        type: OptionType.COMPONENT,
        component: SettingsChannelsManager,
    },
});
