/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { Menu, showToast, Toasts } from "@webpack/common";
import { Guild, User } from "discord-types/general";

import { settings } from "./index";

// Blacklist storage
let blacklistedUsers: Set<string> = new Set();
let blacklistedGuilds: Set<string> = new Set();

// Load blacklists from localStorage on startup
async function loadBlacklists() {
    try {
        const storedUsers = await DataStore.get("activeNowHideIgnored_blacklistedUsers");
        const storedGuilds = await DataStore.get("activeNowHideIgnored_blacklistedGuilds");

        if (storedUsers) {
            blacklistedUsers = new Set(storedUsers);
        }
        if (storedGuilds) {
            blacklistedGuilds = new Set(storedGuilds);
        }
    } catch (e) {
        console.error("Failed to load blacklists:", e);
    }
}

// Save blacklists to DataStore
async function saveBlacklists() {
    try {
        await DataStore.set("activeNowHideIgnored_blacklistedUsers", [...blacklistedUsers]);
        await DataStore.set("activeNowHideIgnored_blacklistedGuilds", [...blacklistedGuilds]);
    } catch (e) {
        console.error("Failed to save blacklists:", e);
    }
}

// Initialize blacklists
loadBlacklists();

// Add/remove functions async
async function addUserToBlacklist(userId: string, username: string) {
    blacklistedUsers.add(userId);
    await saveBlacklists();
    showToast(`Added ${username} to list`, Toasts.Type.SUCCESS);
}

async function removeUserFromBlacklist(userId: string, username: string) {
    blacklistedUsers.delete(userId);
    await saveBlacklists();
    showToast(`Removed ${username} from list`, Toasts.Type.SUCCESS);
}

async function addGuildToBlacklist(guildId: string, guildName: string) {
    blacklistedGuilds.add(guildId);
    await saveBlacklists();
    showToast(`Added ${guildName} to list`, Toasts.Type.SUCCESS);
}

async function removeGuildFromBlacklist(guildId: string, guildName: string) {
    blacklistedGuilds.delete(guildId);
    await saveBlacklists();
    showToast(`Removed ${guildName} from list`, Toasts.Type.SUCCESS);
}

// Export helper functions for use in main plugin

export function isUserBlacklisted(userId: string): boolean {
    if (settings.store.whitelistUsers) {
        return !blacklistedUsers.has(userId);
    }
    return blacklistedUsers.has(userId);
}

export function isGuildBlacklisted(guildId: string): boolean {
    if (settings.store.whitelistServers) {
        return !blacklistedGuilds.has(guildId);
    }
    return blacklistedGuilds.has(guildId);
}

export function getBlacklistedUsers(): string[] {
    return [...blacklistedUsers];
}

export function getBlacklistedGuilds(): string[] {
    return [...blacklistedGuilds];
}

// Helper function to search recursively for any item by ID
function findItemInChildren(items, targetId) {
    if (!items) return null;

    const itemsArray = Array.isArray(items) ? items : [items];

    for (let i = 0; i < itemsArray.length; i++) {
        const item = itemsArray[i];

        // Check if this is the item we're looking for
        if (item?.props?.id === targetId) {
            return { container: itemsArray, index: i };
        }

        // If this item has children, search recursively
        if (item?.props?.children) {
            const result = findItemInChildren(item.props.children, targetId);
            if (result) return result;
        }
    }

    return null;
}

// Guild context menu patches
const guildPopoutPatch: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild, onClose(): void; }) => {
    if (!guild) return;

    const isBlacklisted = isGuildBlacklisted(guild.id);

    const menuItem = (
        <Menu.MenuItem
            label={isBlacklisted ? "Show in Active Now" : "Hide in Active Now"}
            id="HideActiveNowIgnored-guild"
            action={() => {
                if (settings.store.whitelistServers ? !isBlacklisted : !isBlacklisted) {
                    removeGuildFromBlacklist(guild.id, guild.name);
                } else {
                    addGuildToBlacklist(guild.id, guild.name);
                }
            }}
        />
    );

    // Search for the leaver server item using recursive search
    const ignoreLocation = findItemInChildren(children, "leave-guild");

    if (ignoreLocation) {
        // Insert before the leaver server item
        ignoreLocation.container.splice(ignoreLocation.index, 0, menuItem);
    } else {
        children.push(menuItem);
    }

};

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user?: User, onClose(): void; }) => {
    if (!user) return;

    const isBlacklisted = isUserBlacklisted(user.id);

    const menuItem = (
        <Menu.MenuItem
            label={isBlacklisted ? "Show in Active Now" : "Hide in Active Now"}
            id="HideActiveNowIgnored-user"
            action={() => {
                if (settings.store.whitelistServers ? !isBlacklisted : !isBlacklisted) {
                    removeUserFromBlacklist(user.id, user.username);
                } else {
                    addUserToBlacklist(user.id, user.username);
                }
            }}
        />
    );

    // Search for the ignore item using recursive search
    const ignoreLocation = findItemInChildren(children, "ignore");

    if (ignoreLocation) {
        // Insert before the ignore item
        ignoreLocation.container.splice(ignoreLocation.index, 0, menuItem);
    } else {
        children.push(menuItem);
    }
};

export const contextMenus = {
    "guild-header-popout": guildPopoutPatch,
    "guild-context": guildPopoutPatch,
    "user-context": userContextPatch,
    "user-profile-actions": userContextPatch,
    "user-profile-overflow-menu": userContextPatch,
};
