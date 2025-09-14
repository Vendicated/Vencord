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
                match: /\.get\((\i)\)\.nameMatchesChain\(\i\)\.reduce\(\((\i),(\i)\)=>\{/,
                replace: "$& if ($self.shouldSkip($1, $3)) return $2;"
            }
        }
    ],
    shouldSkip(guildId: string, emoji: any) {
        if (emoji.type !== 1) {
            return false;
        }
        if (settings.store.shownEmojis === "onlyUnicode") {
            return true;
        }
        if (settings.store.shownEmojis === "currentServer") {
            return emoji.guildId !== guildId;
        }
        return false;
    }
});
