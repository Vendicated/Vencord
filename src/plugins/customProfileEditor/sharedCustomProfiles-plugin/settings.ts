/*
 * Vencord, a modification for Discord's desktop app
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    syncProfilesFromOthers: {
        type: OptionType.BOOLEAN,
        description: "Show custom usernames and badges shared by other Vencord users",
        default: true,
    },
    registryBaseUrl: {
        type: OptionType.STRING,
        description: "Shared profile registry URL (Cloudflare Worker). Example: https://customprofile-registry.yourname.workers.dev",
        default: "",
    },
});
