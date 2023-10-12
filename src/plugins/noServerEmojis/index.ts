/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    shownEmojis: {
        description: "The types of emojis to show in the autocomplete menu.",
        type: OptionType.SELECT,
        default: "onlyUnicode",
        options: [
            { label: "Only unicode emojis", value: "onlyUnicode" },
            { label: "Unicode emojis and server emojis from current server", value: "currentServer" },
            { label: "Unicode emojis and all server emojis (Discord default)", value: "all" }
        ]
    }
});

export default definePlugin({
    name: "NoServerEmojis",
    authors: [Devs.UlyssesZhan],
    description: "Do not show server emojis in the autocomplete menu.",
    settings,
    patches: [
        {
            find: "queryEmojiResults:",
            replacement: {
                match: /searchWithoutFetchingLatest\(\{/,
                replace: "$&...$self.getExtraProps(),"
            }
        },
        {
            find: "searchWithoutFetchingLatest=",
            replacement: {
                match: /(function\(\i\)\{)(var \i=(\i)\.channel,.{0,600}reduce\(\(function\((\i),(\i)\)\{)/,
                replace: "$1 var includeGuilds = $3.includeGuilds ?? true; $2 if ($5.type === 'GUILD_EMOJI' && !includeGuilds) { return $4; }"
            }
        }
    ],
    getExtraProps() {
        return {
            includeExternalGuilds: this.settings.store.shownEmojis === "all",
            includeGuilds: this.settings.store.shownEmojis === "currentServer" || this.settings.store.shownEmojis === "all"
        };
    }
});
