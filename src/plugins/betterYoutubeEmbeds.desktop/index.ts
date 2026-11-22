/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, SettingsStore } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    fixBlockedEmbeds: {
        type: OptionType.BOOLEAN,
        description: "Restore videos blocked from displaying in Discord, for example by UMG",
        default: true,
        restartNeeded: true
    },
    blockAds: {
        type: OptionType.BOOLEAN,
        description: "Blocks ads in YouTube embeds and WatchTogether. Video may take some seconds to load, due to YouTube's anti-ad measures",
        default: true
    }
});

const { plugins } = SettingsStore.plain;
const { BetterYouTubeEmbeds, FixYoutubeEmbeds, YoutubeAdblock } = plugins;
if (!BetterYouTubeEmbeds && (FixYoutubeEmbeds?.enabled || YoutubeAdblock?.enabled)) {
    plugins.BetterYouTubeEmbeds = { enabled: true };
    SettingsStore.markAsChanged();
}

export default definePlugin({
    name: "BetterYouTubeEmbeds",
    description: "Block ads & bypass UMG blocks",
    tags: ["Media", "Utility"],
    searchTerms: ["YoutubeAdblock", "FixYoutubeEmbeds"],
    authors: [Devs.coolelectronics, Devs.ImLvna, Devs.Ven],
    requiresRestart: true,
    settings
});
