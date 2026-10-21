/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings, migratePluginSetting } from "@api/Settings";
import { Divider } from "@components/Divider";
import { HeadingSecondary } from "@components/Heading";
import { Notice } from "@components/Notice";
import decor from "@plugins/decor";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";

migratePluginSetting("Declutter", "removeShopAboveDms", "removeShopAboveDM");
migratePluginSetting(
    "Declutter",
    "removeQuestsAboveDms",
    "removeQuestsAboveDM",
);

const cl = classNameFactory("vc-declutter-");

export const settings = definePluginSettings({
    userProfileHeader: {
        type: OptionType.COMPONENT,
        component: () => SectionSeparator("User Profile"),
    },
    removeAvatarDecoration: {
        type: OptionType.BOOLEAN,
        description:
            "Remove avatar decorations. This is/will be disabled if Decor is enabled.",
        default: false,
        disabled: () => isPluginEnabled("Decor"),
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
    removeProfileFrame: {
        type: OptionType.BOOLEAN,
        description: "Remove profile frames.",
        default: true,
        restartNeeded: true,
    },
    removeClanTag: {
        type: OptionType.BOOLEAN,
        description: "Remove clan tags.",
        default: true,
        restartNeeded: true,
    },
    removeDisplayNameStyles: {
        type: OptionType.BOOLEAN,
        description: "Remove animated/styled display names in the member list.",
        default: true,
        restartNeeded: true,
    },
    alwaysShowUsername: {
        type: OptionType.BOOLEAN,
        description: "Always show username instead of status.",
        default: true,
        restartNeeded: true,
    },
    accessibilityNotice: {
        type: OptionType.COMPONENT,
        component: () => (
            <Notice.Info className={cl("accessibility-notice")}>
                Discord already has a built-in username style option in
                Accessibility settings.
            </Notice.Info>
        ),
    },
    friendsListHeader: {
        type: OptionType.COMPONENT,
        component: () => SectionSeparator("Above Friends/DMs List"),
    },
    removeShopAboveDms: {
        type: OptionType.BOOLEAN,
        description: "Remove shops above DMs list.",
        default: false,
        restartNeeded: true,
    },
    removeQuestsAboveDms: {
        type: OptionType.BOOLEAN,
        description: "Remove quests above DMs list.",
        default: false,
        restartNeeded: true,
    },
    removeLibraryAboveDms: {
        type: OptionType.BOOLEAN,
        description: "Remove library above DMs list.",
        default: false,
        restartNeeded: true,
    },
    removeFamilyCenterAboveDms: {
        type: OptionType.BOOLEAN,
        description: "Remove family center above DMs list.",
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
        restartNeeded: true,
    },
    removeButtonTooltips: {
        type: OptionType.BOOLEAN,
        description: "Remove button tooltips.",
        default: false,
        restartNeeded: true,
    },
});

function SectionSeparator(title: string) {
    return (
        <div className={cl("section-separator")}>
            <Divider />
            <HeadingSecondary className={cl("section-title")}>
                {title}
            </HeadingSecondary>
        </div>
    );
}

export default definePlugin({
    name: "Declutter",
    description:
        "Cleans up Discord by removing non-essential UI elements like profile effects, shop tabs, boosts, and more.",
    tags: ["Appearance", "Customisation"],
    authors: [EquicordDevs.Leon135, Devs.prism, Devs.Kyuuhachi, Devs.SomeAspy],
    start() {
        if (isPluginEnabled("Decor") && settings.store.removeAvatarDecoration)
            settings.store.removeAvatarDecoration = false;
    },
    settings,
    patches: [
        {
            // Profile frame
            find: "skuId,layers:null!=",
            replacement: {
                match: /(?=0!==\i.length&&\i\?\(0,)/,
                replace: "null&&",
            },
            predicate: () => settings.store.removeProfileFrame,
        },
        {
            // Avatar decoration
            find: "isAvatarDecorationAnimating:",
            replacement: {
                match: /(?<=\{avatarDecoration:.{0,40}?)(void 0!==\i\?\i:)\i(?=\)?,canAnimate:)/,
                replace: "$1null",
            },
            predicate: () =>
                settings.store.removeAvatarDecoration &&
                !isPluginEnabled(decor.name),
        },
        {
            // Avatar decoration on dms list
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /null==\i\|\|\i\?null:\(0,\i\.jsxs?\)\("img",\{className:\i\.\i,src:\i,alt:" ","aria-hidden":!0\}\)/,
                replace: "null",
            },
            predicate: () =>
                settings.store.removeAvatarDecoration &&
                !isPluginEnabled(decor.name),
        },
        // User Area
        {
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            replacement: [
                {
                    match: /((\i)=\i\?\.avatarDecoration,\i=)\(0,\i\.\i\)\(\2\)/,
                    replace: "$1null",
                    predicate: () =>
                        settings.store.removeAvatarDecoration &&
                        !isPluginEnabled(decor.name),
                },
                {
                    match: /(iconForeground:null!=\i\?\i\.\i:void 0,nameplate:)\i/g,
                    replace: "$1null",
                    predicate: () => settings.store.removeNameplate,
                },
                {
                    match: /let\{ref:\i,speaking:\i,playingSoundboard:\i,voiceDb:/,
                    replace: "arguments[0].nameplate=null;$&",
                    predicate: () => settings.store.removeNameplate,
                },
            ],
        },
        {
            // Nameplate
            find: ".MINI_PREVIEW,[",
            replacement: {
                match: /function \i\((\i)\)\{(?=let.{0,5}\{nameplate:\i,)/,
                replace:
                    '$&if($1.placement!=="preview"&&$1.placement!=="mini_preview")return null;',
            },
            predicate: () => settings.store.removeNameplate,
        },
        {
            // Profile banner animation effect
            find: "bannerAdjustment,isHovering",
            replacement: {
                match: /\i=function\((\i)\)\{(?=.{0,50}\.useReducedMotion\))/,
                replace: "$&if(!$1.shopPreview)return null;",
            },
            predicate: () => settings.store.removeProfileEffect,
        },
        {
            // Clan tag
            find: ".GuildFeatures.GUILD_TAGS)",
            replacement: {
                match: /(?<=\.profile\?\.badge.{0,50}\i\)\{)/,
                replace: "return false;",
            },
            predicate: () => settings.store.removeClanTag,
        },
        {
            // Display name styles in member list
            find: "#{intl::GUILD_OWNER}),children:",
            replacement: [
                {
                    match: /(\i)=\(0,\i\.\i\)\(\{userId:\i\?\.id,guildId:\i\}\)/,
                    replace: "$1=null",
                },
                {
                    match: /animateRoleGradient:\i/,
                    replace: "animateRoleGradient:false",
                },
                {
                    match: /colorStrings:\i,/,
                    replace: "",
                },
            ],
            predicate: () => settings.store.removeDisplayNameStyles,
        },
        {
            // Always show username
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            replacement: {
                match: /hoverText:(\i),forceHover:\i,children:/g,
                replace: "hoverText:$1,forceHover:!0,children:",
            },
            predicate: () => settings.store.alwaysShowUsername,
        },
        {
            // Button tooltips in user area
            find: '"MicrophoneButton"',
            replacement: [
                {
                    // Button tooltips
                    match: /:\{tooltipText:\i\};/,
                    replace: ":{tooltipText:void 0};",
                    predicate: () => settings.store.removeButtonTooltips,
                },
                {
                    // Audio menus
                    match: /(?<=#{intl::MUTE}\),)className:\i\.\i,/,
                    replace: "",
                    predicate: () => settings.store.removeAudioMenus,
                },
                {
                    // Audio menus
                    match: /,\(0,\i\.jsxs?\)\(\i\.\i,\{.{0,600}#{intl::ACCOUNT_INPUT_OPTIONS}\)\}\)(?=\])/,
                    replace: "",
                    predicate: () => settings.store.removeAudioMenus,
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
                    predicate: () => settings.store.removeButtonTooltips,
                },
                {
                    // Audio menus
                    match: /(?<=#{intl::DEAFEN}\),)className:\i\.\i,/,
                    replace: "",
                    predicate: () => settings.store.removeAudioMenus,
                },
                {
                    // Audio menus
                    match: /,\(0,\i\.jsxs?\)\(\i\.\i,\{.{0,650}#{intl::ACCOUNT_OUTPUT_OPTIONS}\)\}\)(?=\])/,
                    replace: "",
                    predicate: () => settings.store.removeAudioMenus,
                },
            ],
        },
        {
            // ? Another button tooltips
            find: "#{intl::USER_SETTINGS_WITH_BUILD_OVERRIDE}",
            replacement: {
                match: /tooltipText:\i,tooltipPositionKey/,
                replace: "tooltipText:void 0,tooltipPositionKey",
            },
            predicate: () => settings.store.removeButtonTooltips,
        },
        {
            // Above DMs section
            find: 'tutorialId:"direct-messages"',
            replacement: [
                {
                    match: /"nitro-tab-group"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.removeShopAboveDms,
                },
                {
                    match: /NAVIGATION_LINK\}\}\},"discord-shop"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.removeShopAboveDms,
                },
                {
                    match: /\.QUEST_HOME\)\},"quests"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.removeQuestsAboveDms,
                },
                {
                    match: /\.APPLICATION_LIBRARY\)\},"library"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.removeLibraryAboveDms,
                },
                {
                    match: /\.FAMILY_CENTER\)\},"family-center"\)/,
                    replace: "$&&&undefined",
                    predicate: () => settings.store.removeFamilyCenterAboveDms,
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
            predicate: () => settings.store.removeShopAboveDms,
        },
        {
            // Channel list server boost progress bar
            find: "useGuildActionRow",
            replacement: {
                match: /(GUILD_NEW_MEMBER_ACTIONS_PROGRESS_BAR\)):\i(?:\.premiumProgressBarEnabled)?/,
                replace: "$1:null",
            },
            predicate: () => settings.store.removeServerBoostInfo,
        },
        {
            // Billing settings
            find: ".BILLING_SECTION,",
            replacement: {
                match: /(\.BILLING_SECTION.{0,50}buildLayout:\(\)=>\[).{0,15}?\]/,
                replace: "$1]",
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
                replace: "$&$1||",
            },
            predicate: () => settings.store.removeUnavailableEmojiPicker,
        },
        {
            // Emoji category list
            find: "#{intl::EMOJI_CATEGORY_TOP_GUILD_EMOJI},{guildName:",
            replacement: {
                match: /(?<=(\i)\.unshift\((\i)\):)(?=\1\.push\(\2\))/,
                replace: "$2.isNitroLocked||",
            },
            predicate: () => settings.store.removeUnavailableEmojiPicker,
        },
    ],
});
