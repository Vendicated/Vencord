/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 satanas and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const DEFAULT_BASE_URL = "https://custom-typing.rocknite-studio.com";

export const settings = definePluginSettings({
    baseUrl: {
        type: OptionType.STRING,
        description: "Where the shared indicators are read from. Set yours with the /set command of the bot, and change this only if you host your own instance",
        default: DEFAULT_BASE_URL,
        placeholder: DEFAULT_BASE_URL
    }
});
