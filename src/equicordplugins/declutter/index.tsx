/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSetting, migratePluginSettings } from "@api/Settings";
import { HeadingSecondary } from "@components/Heading";
import { Devs, EquicordDevs } from "@utils/index";
import definePlugin, { OptionType } from "@utils/types";

migratePluginSettings("Declutter", "BetterUserArea", "Anammox");

const migrationsAnammox = [
    ["dms", "removeShopAboveDM"],
    ["quests", "removeQuestsAboveDM"],
    ["serverBoost", "removeServerBoostInfo"],
    ["billing", "removeBillingSettings"],
    ["gift", "removeGiftButton"],
    ["emojiList", "removeUnavailableEmojiPicker"],
];

for (const [oldKey, newKey] of migrationsAnammox) {
    migratePluginSetting("Anammox", newKey, oldKey);
}

export const settings = definePluginSettings({
    userProfileHeader: {
        type: OptionType.COMPONENT,
        component: () => SectionSeparator("User Profile"),
    },
    removeAvatarDecoration: {
        type: OptionType.BOOLEAN,
        description: "Remove avatar decorations.",
        default: true,
        restartNeeded: true,
    },
    removeNameplate: {
        type: OptionType.BOOLEAN,
        description: "Remove nameplates.",
        default: true,
        restartNeeded: true,
    },
    removeProfileEffect: {
        type: OptionType.BOOLEAN,
        description: "Remove profile animation effects on open.",
        default: true,
        restartNeeded: true,
    },
    removeClanTag: {
        type: OptionType.BOOLEAN,
        description: "Remove clan tags.",
        default: true,
        restartNeeded: true,
    },
    alwaysShowUsername: {
        type: OptionType.BOOLEAN,
        description: "Always show username instead of status.",
        default: true,
        restartNeeded: true
    },
    removeUsernameStyles: {
        type: OptionType.BOOLEAN,
        description: "Remove username colors and effects.",
        default: true,
        restartNeeded: true
    },
    friendsListHeader: {
        type: OptionType.COMPONENT,
        component: () => SectionSeparator("Above Friends/DMs List"),
    },
    removeShopAboveDM: {
        type: OptionType.BOOLEAN,
        description: "Remove shops above DMs list.",
        default: true,
        restartNeeded: true,
    },
    removeQuestsAboveDM: {
        type: OptionType.BOOLEAN,
        description: "Remove quests above DMs list.",
        default: false,
        restartNeeded: true,
    },
    miscHeader: {
        type: OptionType.COMPONENT,
        component: () => SectionSeparator("Misc"),
    },
    removeServerBoostInfo: {
        type: OptionType.BOOLEAN,
        description: "Remove server boost info above channel list.",
        default: true,
        restartNeeded: true,
    },
    removeBillingSettings: {
        type: OptionType.BOOLEAN,
        description: "Remove billing settings.",
        default: true,
        restartNeeded: true,
    },
    removeGiftButton: {
        type: OptionType.BOOLEAN,
        description: "Remove gift button.",
        default: true,
        restartNeeded: true,
    },
    removeUnavailableEmojiPicker: {
        type: OptionType.BOOLEAN,
        description: "Remove unavailable categories from the emoji picker.",
        default: true,
        restartNeeded: true,
    },
    removeAudioMenus: {
        type: OptionType.BOOLEAN,
        description: "Remove menus next to mute and deafen buttons.",
        default: true,
        restartNeeded: true
    },
    removeButtonTooltips: {
        type: OptionType.BOOLEAN,
        description: "Remove button tooltips.",
        default: false,
        restartNeeded: true
    },
});

function SectionSeparator(title: string) {
    return (
        <>
            <hr style={{ width: "100%" }} />
            <HeadingSecondary>{title}</HeadingSecondary>
            <hr style={{ width: "100%" }} />
        </>
    );
}

export default definePlugin({
    name: "Declutter",
    description: "Declutter discord ui by removing unwanted elements such as profile customizations, shops, quests and more.",
    authors: [EquicordDevs.Leon135, Devs.prism, Devs.Kyuuhachi],
    settings,
    patches: [
        {
            // Avatar decoration
            find: "getAvatarDecorationURL:",
            replacement: {
                match: /function \i\(\i\)\{(?=.{0,10}avatarDecoration)/,
                replace: "$&return null;"
            },
            predicate: () => settings.store.removeAvatarDecoration,
        },
        {
            // Nameplate
            find: "#{intl::AVATAR_MALLOW}",
            replacement: {
                match: /function \i\(\i\)\{(?=.{0,25}skuId:)/,
                replace: "$&return null;"
            },
            predicate: () => settings.store.removeNameplate,
        },
        {
            // Profile banner animation effect
            find: "bannerAdjustment,noBorderRadius",
            replacement: {
                match: /\i=\i=>\{(?=.{0,50}\.useReducedMotion\))/,
                replace: "$&return null;"
            },
            predicate: () => settings.store.removeProfileEffect,
        },
        {
            // Clan tag
            find: ".GuildFeatures.GUILD_TAGS)",
            replacement: {
                match: /(?<=\.profile\?\.badge.{0,50}\i\)\{)/,
                replace: "return false;"
            },
            predicate: () => settings.store.removeClanTag,
        },
        {
            // Username styles and allways show username
            find: ".NITRO_PRIVACY_PERK_BETA_COACHMARK));",
            replacement: [
                {
                    match: /displayNameStyles:(\i),/,
                    replace: "displayNameStyles:void 0,",
                    predicate: () => settings.store.removeUsernameStyles
                },
                {
                    match: /hoverText:(\i),forceHover:\i,children:/g,
                    replace: "hoverText:$1,forceHover:!0,children:",
                    predicate: () => settings.store.alwaysShowUsername
                },
            ],
        },
        {
            // Button tooltips in user area
            find: '"MicrophoneButton"',
            replacement: [
                {
                    // Button tooltips
                    match: /:\{tooltipText:\i\};/,
                    replace: ":{tooltipText:void 0};",
                    predicate: () => settings.store.removeButtonTooltips
                },
                {
                    // Audio menus
                    match: /(?<=#{intl::MUTE}\),)className:\i\.\i,/,
                    replace: "",
                    predicate: () => settings.store.removeAudioMenus
                },
                {
                    // Audio menus
                    match: /,\(0,\i\.jsxs?\)\(\i\.\i,\{.{0,600}#{intl::ACCOUNT_INPUT_OPTIONS}\)\}\)(?=\])/,
                    replace: "",
                    predicate: () => settings.store.removeAudioMenus
                },
            ],
        },
        {
            // Button tooltips in right click audio settings
            find: "#{intl::f+DDY/::raw},{outputDeviceName",
            replacement: [
                {
                    // Button tooltips
                    match: /(?<=role:"switch",)tooltipText:\i\}/,
                    replace: "tooltipText:void 0}",
                    predicate: () => settings.store.removeButtonTooltips
                },
                {
                    // Audio menus
                    match: /(?<=#{intl::DEAFEN}\),)className:\i\.\i,/,
                    replace: "",
                    predicate: () => settings.store.removeAudioMenus
                },
                {
                    // Audio menus
                    match: /,\(0,\i\.jsxs?\)\(\i\.\i,\{.{0,650}#{intl::ACCOUNT_OUTPUT_OPTIONS}\)\}\)(?=\])/,
                    replace: "",
                    predicate: () => settings.store.removeAudioMenus
                }
            ],
        },
        {
            // ? Another button tooltips
            find: "#{intl::USER_SETTINGS_WITH_BUILD_OVERRIDE}",
            replacement: {
                match: /tooltipText:\i,tooltipPositionKey/,
                replace: "tooltipText:void 0,tooltipPositionKey"
            },
            predicate: () => settings.store.removeButtonTooltips
        },
        {
            // Above DMs section, shops and quests
            find: 'tutorialId:"direct-messages"',
            replacement: [
                {
                    match: /"nitro-tab-group"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.removeShopAboveDM,
                },
                {
                    match: /"discord-shop"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.removeShopAboveDM

                },
                {
                    match: /"quests"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.removeQuestsAboveDM
                },
            ],
        },
        {
            // Above DMs section, keyboard navigation
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
            predicate: () => settings.store.removeShopAboveDM,
        },
        {
            // Channel list server boost progress bar
            find: "useGuildActionRow",
            replacement: {
                match: /(GUILD_NEW_MEMBER_ACTIONS_PROGRESS_BAR\)):(\i(?:\.premiumProgressBarEnabled)?)/,
                replace: "$1:null"
            },
            predicate: () => settings.store.removeServerBoostInfo,
        },
        {
            // Billing settings
            find: ".BILLING_SECTION,",
            replacement: {
                match: /(?<=buildLayout:\(\)=>)\[.+?\]/,
                replace: "[]",
            },
            predicate: () => settings.store.removeBillingSettings,
        },
        {
            // Gift button
            find: '"sticker")',
            replacement: {
                match: /&&\i\.push\(\([^&]*?,"gift"\)\)/,
                replace: "",
            },
            predicate: () => settings.store.removeGiftButton,
        },
        {
            // Emoji list
            find: "#{intl::EMOJI_PICKER_EXPAND_EMOJI_SECTION}),size:",
            replacement: {
                match: /(\i)=\i\|\|!\i&&\i.\i.isEmojiCategoryNitroLocked\(\{[^}]*\}\);/,
                replace: "$&$1||"
            },
            predicate: () => settings.store.removeUnavailableEmojiPicker,
        },
        {
            // Emoji category list
            find: "#{intl::EMOJI_CATEGORY_TOP_GUILD_EMOJI},{guildName:",
            replacement: {
                match: /(?<=(\i)\.unshift\((\i)\):)(?=\1\.push\(\2\))/,
                replace: "$2.isNitroLocked||"
            },
            predicate: () => settings.store.removeUnavailableEmojiPicker,
        }
    ],
});
