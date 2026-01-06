/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    dms: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove shops above DMs list",
        restartNeeded: true,
    },
    quests: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Remove quests above DMs list",
        restartNeeded: true,
    },
    serverBoost: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove server boost info above channel list",
        restartNeeded: true,
    },
    billing: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove billing settings",
        restartNeeded: true,
    },
    gift: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove gift button",
        restartNeeded: true,
    },
    emojiList: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove unavailable categories from the emoji picker",
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "Anammox",
    description: "Hides various features related to nitro and the store",
    authors: [Devs.Kyuuhachi],
    settings,

    patches: [
        {
            // Above DMs, mouse nav
            find: 'tutorialId:"direct-messages"',
            replacement: [
                {
                    match: /"nitro-tab-group"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.dms
                },
                {
                    match: /"discord-shop"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.dms
                },
                {
                    match: /"quests"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.quests
                },
            ],
        },
        {
            // Above DMs, keyboard nav
            find: ".hasLibraryApplication()&&!",
            replacement: [
                {
                    match: /\i\.\i\.APPLICATION_STORE,/,
                    replace: "/*$&*/",
                },
                {
                    match: /\i\.\i\.COLLECTIBLES_SHOP,/,
                    replace: "/*$&*/",
                },
            ],
            predicate: () => settings.store.dms,
        },
        {
            // Channel list server boost progress bar
            find: "useGuildActionRow",
            replacement: {
                match: /\i\.premiumProgressBarEnabled&&[^,]+/,
                replace: "null"
            },
            predicate: () => settings.store.serverBoost,
        },
        {
            // Settings, sidebar
            find: ".BILLING_SECTION,",
            replacement: {
                match: /(?<=buildLayout:\(\)=>)\[.+?\]/,
                replace: "[]",
            },
            predicate: () => settings.store.billing,
        },
        {
            // Gift button
            find: '"sticker")',
            replacement: { match: /&&\i\.push\(\{[^&]*?,"gift"\)\}\)/, replace: "", },
            predicate: () => settings.store.gift,
        },
        {
            // Emoji list
            find: "#{intl::EMOJI_PICKER_CREATE_EMOJI_TITLE}),size:",
            replacement: {
                match: /(\i)=\i\|\|!\i&&\i.\i.isEmojiCategoryNitroLocked\(\{[^}]*\}\);/,
                replace: "$&$1||"
            },
            predicate: () => settings.store.emojiList,
        },
        {
            // Emoji category list
            find: "#{intl::EMOJI_CATEGORY_TOP_GUILD_EMOJI},{guildName:",
            replacement: {
                match: /(?<=(\i)\.unshift\((\i)\):)(?=\1\.push\(\2\))/,
                replace: "$2.isNitroLocked||"
            },
            predicate: () => settings.store.emojiList,
        }
    ],
});
