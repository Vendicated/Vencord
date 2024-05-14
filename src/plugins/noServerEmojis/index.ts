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
            find: "}searchWithoutFetchingLatest(",
            replacement: {
                match: /searchWithoutFetchingLatest.{20,300}get\((\i).{10,40}?reduce\(\((\i),(\i)\)=>\{/,
                replace: `
                    $&
                    let shownEmojis = $self.settings.store.shownEmojis;
                    if ($3.type === 'GUILD_EMOJI') {
                        if (shownEmojis === 'onlyUnicode') {
                            return $2;
                        }
                        if (shownEmojis === 'currentServer' && $3.guildId !== $1) {
                            return $2;
                        }
                    }
                `
            }
        }
    ]
});
