/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
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
    description: "A microbial process that plays an important part in the nitrogen cycle",
    authors: [Devs.Kyuuhachi],
    settings,

    patches: [
        { // Above DMs, mouse nav
            find: 'tutorialId:"direct-messages"',
            replacement: [
                {
                    match: /"premium"\)/,
                    replace: "$&&&undefined",
                },
                {
                    match: /"discord-shop"\)/,
                    replace: "$&&&undefined",
                },
            ],
            predicate: () => settings.store.dms,
        },
        { // Above DMs, keyboard nav
            find: ".default.hasLibraryApplication()&&!",
            replacement: [
                {
                    match: /\i\.Routes\.APPLICATION_STORE,/,
                    replace: "/*$&*/",
                },
                {
                    match: /\i\.Routes\.COLLECTIBLES_SHOP,/,
                    replace: "/*$&*/",
                },
            ],
            predicate: () => settings.store.dms,
        },
        { // Settings, sidebar
            find: "Messages.BILLING_SETTINGS",
            replacement: {
                match: /\{header:[^:,]*\.Messages.BILLING_SETTINGS,[^}]*\]},/,
                replace: "/*$&*/"
            },
            predicate: () => settings.store.billing,
        },
        { // Gift button
            find: 'Messages.PREMIUM_GIFT_BUTTON_LABEL,"aria-haspopup":"dialog",onClick:',
            replacement: {
                match: /if\(\w+\)return null;/,
                replace: "return null;",
            },
            predicate: () => settings.store.gift,
        },
        { // Emoji list
            find: "useEmojiGrid:function()",
            replacement: {
                match: /(\w+)=!\w+&&\w+.default.isEmojiCategoryNitroLocked\(\{[^}]*\}\);/,
                replace: "$&$1||"
            },
            predicate: () => settings.store.emojiList,
        },
        { // Emoji category list
            find: "useEmojiCategories:function()",
            replacement: {
                match: /(?<=(\i)\.unshift\((\i)\):)(?=\1\.push\(\2\))/,
                replace: "$2.isNitroLocked||"
            },
            predicate: () => settings.store.emojiList,
        }
    ],
});
