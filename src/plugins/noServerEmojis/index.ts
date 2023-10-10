/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "NoServerEmojis",
    authors: [Devs.UlyssesZhan],
    description: "Do not show server emojis in the autocomplete menu.",
    settings: definePluginSettings({
        includeGuilds: {
            description: "If disabled, server emojis will not be shown in the autocomplete menu at all.",
            type: OptionType.BOOLEAN,
            default: false
        },
        includeExternalGuilds: {
            description: "If disabled, emojis from external servers will not be shown in the autocomplete menu. " +
                "This setting has no effect if \"Include guild emojis\" is disabled. " +
                "Enabling both makes Discord's default behavior.",
            type: OptionType.BOOLEAN,
            default: false
        }
    }),
    patches: [
        {
            find: "queryEmojiResults:",
            replacement: {
                match: /searchWithoutFetchingLatest\(\{/,
                replace: "$&" +
                    "includeExternalGuilds:$self.settings.store.includeExternalGuilds," +
                    "includeGuilds:$self.settings.store.includeGuilds,"
            }
        },
        {
            find: "searchWithoutFetchingLatest=",
            replacement: {
                match: /(function\(\i\)\{)(var \i=(\i)\.channel,.{0,600}reduce\(\(function\((\i),(\i)\)\{)/,
                replace: "$1 var includeGuilds = $3.includeGuilds ?? true; $2 if ($5.type === 'GUILD_EMOJI' && !includeGuilds) { return $4; }"
            }
        }
    ]
});
