/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    EXTENSIONS_CATALOG_CATEGORY_ID,
    EXTENSIONS_ROOT_CATEGORY_ID,
    HOLY_NOTES_EXTENSION_DETAIL_CATEGORY_ID,
    RANDOM_VOICE_EXTENSION_DETAIL_CATEGORY_ID,
    SCHEDULED_MESSAGES_EXTENSION_DETAIL_CATEGORY_ID,
    SILENT_MESSAGE_TOGGLE_EXTENSION_DETAIL_CATEGORY_ID,
    SILENT_TYPING_EXTENSION_DETAIL_CATEGORY_ID
} from "../extensions/catalog";
import type { CommandCategory } from "../registry";
import {
    TAG_CONTEXT,
    TAG_CORE,
    TAG_CUSTOM,
    TAG_DEVELOPER,
    TAG_FRIENDS,
    TAG_GUILDS,
    TAG_NAVIGATION,
    TAG_PLUGINS,
    TAG_SESSION,
    TAG_UTILITY
} from "./tags";

export const DEFAULT_CATEGORY_ID = "quick-actions";
export const CUSTOM_COMMANDS_CATEGORY_ID = "custom-commands";
export const SESSION_TOOLS_CATEGORY_ID = "session-tools";
export const CONTEXT_PROVIDER_ID = "context-current";
export const CUSTOM_PROVIDER_ID = "custom-commands";
export const TOOLBOX_ACTIONS_CATEGORY_ID = "plugins-settings";
export const TOOLBOX_ACTIONS_PROVIDER_ID = "plugin-toolbox-actions";
export const CHATBAR_ACTIONS_CATEGORY_ID = "plugins-settings";
export const GUILD_CATEGORY_ID = "guilds-actions";
export const FRIENDS_CATEGORY_ID = "friends-actions";
export const PLUGIN_MANAGER_ROOT_COMMAND_ID = "plugins-manager-root";
export const PLUGIN_MANAGER_ENABLE_COMMAND_ID = "plugins-manager-enable";
export const PLUGIN_MANAGER_DISABLE_COMMAND_ID = "plugins-manager-disable";
export const PLUGIN_MANAGER_SETTINGS_COMMAND_ID = "plugins-manager-settings";
export const MENTION_PROVIDER_ID = "mentions-provider";
export const MENTIONS_CATEGORY_ID = "mentions-actions";
export const RECENTS_CATEGORY_ID = "recent-actions";
export const PINNED_CATEGORY_ID = "pinned-actions";

export const CATEGORY_WEIGHTS = new Map<string, number>([
    [DEFAULT_CATEGORY_ID, 100],
    [CONTEXT_PROVIDER_ID, 95],
    [SESSION_TOOLS_CATEGORY_ID, 90],
    ["discord-settings", 90],
    ["updates", 75],
    [CUSTOM_COMMANDS_CATEGORY_ID, 80],
    ["plugins", 45],
    ["plugins-enable", 45],
    ["plugins-disable", 45],
    ["plugins-settings", 45],
    [MENTIONS_CATEGORY_ID, 55],
    [PINNED_CATEGORY_ID, 72],
    [RECENTS_CATEGORY_ID, 70],
    [EXTENSIONS_ROOT_CATEGORY_ID, 60],
    [EXTENSIONS_CATALOG_CATEGORY_ID, 60],
    [SILENT_TYPING_EXTENSION_DETAIL_CATEGORY_ID, 60],
    [RANDOM_VOICE_EXTENSION_DETAIL_CATEGORY_ID, 60],
    [HOLY_NOTES_EXTENSION_DETAIL_CATEGORY_ID, 60],
    [SILENT_MESSAGE_TOGGLE_EXTENSION_DETAIL_CATEGORY_ID, 60],
    [SCHEDULED_MESSAGES_EXTENSION_DETAIL_CATEGORY_ID, 60],
    [GUILD_CATEGORY_ID, 40],
    [FRIENDS_CATEGORY_ID, 40]
]);

export const CATEGORY_GROUP_LABELS = new Map<string | undefined, string>([
    [DEFAULT_CATEGORY_ID, "Core Actions"],
    [CONTEXT_PROVIDER_ID, "Core Actions"],
    [SESSION_TOOLS_CATEGORY_ID, "Core Actions"],
    ["discord-settings", "Discord Settings"],
    ["updates", "Updates"],
    [CUSTOM_COMMANDS_CATEGORY_ID, "Custom Commands"],
    ["plugins", "Plugin Controls"],
    ["plugins-enable", "Plugin Controls"],
    ["plugins-disable", "Plugin Controls"],
    ["plugins-settings", "Plugin Controls"],
    [MENTIONS_CATEGORY_ID, "Mentions"],
    [PINNED_CATEGORY_ID, "Core Actions"],
    [RECENTS_CATEGORY_ID, "Core Actions"],
    [EXTENSIONS_ROOT_CATEGORY_ID, "Extensions"],
    [EXTENSIONS_CATALOG_CATEGORY_ID, "Extensions"],
    [SILENT_TYPING_EXTENSION_DETAIL_CATEGORY_ID, "Extensions"],
    [RANDOM_VOICE_EXTENSION_DETAIL_CATEGORY_ID, "Extensions"],
    [HOLY_NOTES_EXTENSION_DETAIL_CATEGORY_ID, "Extensions"],
    [SILENT_MESSAGE_TOGGLE_EXTENSION_DETAIL_CATEGORY_ID, "Extensions"],
    [SCHEDULED_MESSAGES_EXTENSION_DETAIL_CATEGORY_ID, "Extensions"],
    [GUILD_CATEGORY_ID, "Guilds"],
    [FRIENDS_CATEGORY_ID, "Friends"]
]);

export const DEFAULT_CATEGORY_WEIGHT = 50;

export const CATEGORY_DEFAULT_TAGS = new Map<string, string[]>([
    [DEFAULT_CATEGORY_ID, [TAG_CORE]],
    [CONTEXT_PROVIDER_ID, [TAG_CONTEXT]],
    [SESSION_TOOLS_CATEGORY_ID, [TAG_SESSION]],
    ["discord-settings", [TAG_NAVIGATION]],
    ["updates", [TAG_DEVELOPER]],
    [CUSTOM_COMMANDS_CATEGORY_ID, [TAG_CUSTOM]],
    ["plugins", [TAG_PLUGINS]],
    ["plugins-enable", [TAG_PLUGINS]],
    ["plugins-disable", [TAG_PLUGINS]],
    ["plugins-settings", [TAG_PLUGINS, TAG_UTILITY]],
    [MENTIONS_CATEGORY_ID, [TAG_NAVIGATION]],
    [PINNED_CATEGORY_ID, [TAG_CORE, TAG_UTILITY]],
    [RECENTS_CATEGORY_ID, [TAG_CORE, TAG_UTILITY]],
    [EXTENSIONS_ROOT_CATEGORY_ID, [TAG_PLUGINS, TAG_UTILITY]],
    [EXTENSIONS_CATALOG_CATEGORY_ID, [TAG_PLUGINS, TAG_UTILITY]],
    [SILENT_TYPING_EXTENSION_DETAIL_CATEGORY_ID, [TAG_PLUGINS, TAG_UTILITY]],
    [RANDOM_VOICE_EXTENSION_DETAIL_CATEGORY_ID, [TAG_PLUGINS, TAG_UTILITY]],
    [HOLY_NOTES_EXTENSION_DETAIL_CATEGORY_ID, [TAG_PLUGINS, TAG_UTILITY]],
    [SILENT_MESSAGE_TOGGLE_EXTENSION_DETAIL_CATEGORY_ID, [TAG_PLUGINS, TAG_UTILITY]],
    [SCHEDULED_MESSAGES_EXTENSION_DETAIL_CATEGORY_ID, [TAG_PLUGINS, TAG_UTILITY]],
    [GUILD_CATEGORY_ID, [TAG_GUILDS]],
    [FRIENDS_CATEGORY_ID, [TAG_FRIENDS]]
]);

export const BUILT_IN_CATEGORIES: CommandCategory[] = [
    {
        id: DEFAULT_CATEGORY_ID,
        label: "Quick Actions",
        description: "Common Equicord shortcuts"
    },
    {
        id: "plugins",
        label: "Plugins",
        description: "Manage Equicord and Vencord plugins"
    },
    {
        id: CONTEXT_PROVIDER_ID,
        label: "Current Context",
        description: "Actions for the selected channel and guild"
    },
    {
        id: "plugins-enable",
        label: "Enable Plugin",
        parentId: "plugins"
    },
    {
        id: "plugins-disable",
        label: "Disable Plugin",
        parentId: "plugins"
    },
    {
        id: "plugins-settings",
        label: "Plugin Settings",
        parentId: "plugins"
    },
    {
        id: "updates",
        label: "Updates",
        description: "Stay up to date with Equicord"
    },
    {
        id: "discord-settings",
        label: "Discord Settings",
        description: "Jump to Discord configuration pages"
    },
    {
        id: CUSTOM_COMMANDS_CATEGORY_ID,
        label: "Custom Commands",
        description: "User-defined command palette entries"
    },
    {
        id: SESSION_TOOLS_CATEGORY_ID,
        label: "Session Tools",
        description: "Utilities for managing your Discord session"
    },
    {
        id: GUILD_CATEGORY_ID,
        label: "Guilds",
        description: "Quickly navigate to your guilds"
    },
    {
        id: FRIENDS_CATEGORY_ID,
        label: "Friends",
        description: "Quickly DM your friends"
    },
    {
        id: PINNED_CATEGORY_ID,
        label: "Pinned Commands",
        description: "Commands you pinned for quick access"
    },
    {
        id: MENTIONS_CATEGORY_ID,
        label: "Mentions",
        description: "Your recent mentions and inbox items"
    },
    {
        id: RECENTS_CATEGORY_ID,
        label: "Recent Commands",
        description: "Recently executed commands"
    },
    {
        id: EXTENSIONS_ROOT_CATEGORY_ID,
        label: "Extensions",
        description: "Install extension command packs."
    },
    {
        id: EXTENSIONS_CATALOG_CATEGORY_ID,
        label: "Catalog",
        parentId: EXTENSIONS_ROOT_CATEGORY_ID
    },
    {
        id: SILENT_TYPING_EXTENSION_DETAIL_CATEGORY_ID,
        label: "SilentTyping",
        parentId: EXTENSIONS_CATALOG_CATEGORY_ID
    },
    {
        id: RANDOM_VOICE_EXTENSION_DETAIL_CATEGORY_ID,
        label: "RandomVoice",
        parentId: EXTENSIONS_CATALOG_CATEGORY_ID
    },
    {
        id: HOLY_NOTES_EXTENSION_DETAIL_CATEGORY_ID,
        label: "HolyNotes",
        parentId: EXTENSIONS_CATALOG_CATEGORY_ID
    },
    {
        id: SILENT_MESSAGE_TOGGLE_EXTENSION_DETAIL_CATEGORY_ID,
        label: "SilentMessageToggle",
        parentId: EXTENSIONS_CATALOG_CATEGORY_ID
    },
    {
        id: SCHEDULED_MESSAGES_EXTENSION_DETAIL_CATEGORY_ID,
        label: "ScheduledMessages",
        parentId: EXTENSIONS_CATALOG_CATEGORY_ID
    }
];
