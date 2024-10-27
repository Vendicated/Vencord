/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

const settings = definePluginSettings({
    guildChannels: {
        description: "Show message peek in guild channels",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    dms: {
        description: "Show message peek in DMs",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

export default settings;
export { settings };
