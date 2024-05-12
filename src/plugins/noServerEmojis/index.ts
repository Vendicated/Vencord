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
            find: ",queryEmojiResults(",
            replacement: {
                match: /searchWithoutFetchingLatest\(\{/,
                replace: "$&...$self.getExtraProps(),"
            }
        },
        {
            find: "}searchWithoutFetchingLatest(",
            replacement: {
                match: /(searchWithoutFetchingLatest.+?=(\i);)(.+?reduce\(\((\i),(\i)\)=>\{)/,
                replace: "$1 let includeGuilds = $2.includeGuilds ?? true; $3 if ($5.type === 'GUILD_EMOJI' && !includeGuilds) { return $4; }"
            }
        },
        // to be compatible with "Enable Emoji Bypass" in FakeNitro
        {
            find: "isExternalEmojiAllowedForIntention:function",
            replacement: {
                match: /(\i)\[.{5,30}?\]=.{20,60}?return!\i.has\((\i)\)/,
                replace: "$& && ($2 !== $1.CHAT || $self.settings.store.shownEmojis !== 'currentServer')"
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
