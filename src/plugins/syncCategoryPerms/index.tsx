/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Alerts, ChannelStore, Constants, Menu, PermissionsBits, PermissionStore, RestAPI, showToast, Toasts } from "@webpack/common";

function permissionsMatch(perms1: any, perms2: any): boolean {
    const perms1Obj = perms1 || {};
    const perms2Obj = perms2 || {};

    const keys1 = Object.keys(perms1Obj);
    const keys2 = Object.keys(perms2Obj);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        const p1 = perms1Obj[key];
        const p2 = perms2Obj[key];

        if (!p2 || p1.id !== p2.id || p1.type !== p2.type ||
            p1.allow !== p2.allow || p1.deny !== p2.deny) {
            return false;
        }
    }

    return true;
}

async function syncCategoryPermissions(categoryId: string) {
    const category = ChannelStore.getChannel(categoryId);
    if (!category || category.type !== 4) {
        showToast("Invalid category", Toasts.Type.FAILURE);
        return;
    }

    const guildId = category.guild_id;
    const categoryPermissions = category.permissionOverwrites;

    // Get all channels in the guild
    const allChannels = Object.values(ChannelStore.getMutableGuildChannelsForGuild(guildId));

    // Filter channels that are in this category
    const channelsInCategory = allChannels.filter(
        (channel: any) => channel.parent_id === categoryId
    );

    if (channelsInCategory.length === 0) {
        showToast("No channels found in this category", Toasts.Type.MESSAGE);
        return;
    }

    try {
        // Sync permissions for each channel in the category
        const promises = channelsInCategory.map((channel: any) =>
            RestAPI.patch({
                url: Constants.Endpoints.CHANNEL(channel.id),
                body: {
                    permission_overwrites: Object.values(categoryPermissions)
                }
            })
        );

        await Promise.all(promises);

        showToast(
            `Successfully synced permissions for ${channelsInCategory.length} channel${channelsInCategory.length === 1 ? "" : "s"}`,
            Toasts.Type.SUCCESS
        );
    } catch (error) {
        console.error("Failed to sync category permissions:", error);
        showToast("Failed to sync permissions", Toasts.Type.FAILURE);
    }
}

const ChannelContext: NavContextMenuPatchCallback = (children, { channel }) => {
    // Only show for categories where user has manage channels permission
    if (!channel || channel.type !== 4) return;

    const canManage = PermissionStore.can(PermissionsBits.MANAGE_CHANNELS, channel);
    if (!canManage) return;

    children.splice(-1, 0,
        <Menu.MenuItem
            id="sync-category-perms"
            label="Sync Permissions to All Channels"
            action={() => {
                const allChannels = Object.values(ChannelStore.getMutableGuildChannelsForGuild(channel.guild_id));
                const channelsInCategory = allChannels.filter(
                    (ch: any) => ch.parent_id === channel.id
                );

                if (channelsInCategory.length === 0) {
                    showToast("No channels found in this category", Toasts.Type.MESSAGE);
                    return;
                }

                // Check if all channels already have matching permissions
                const categoryPermissions = channel.permissionOverwrites;
                const allSynced = channelsInCategory.every((ch: any) =>
                    permissionsMatch(ch.permissionOverwrites, categoryPermissions)
                );

                if (allSynced) {
                    Alerts.show({
                        title: "Permissions Already Synced",
                        body: `All ${channelsInCategory.length} channel${channelsInCategory.length === 1 ? "" : "s"} in ${channel.name} already have the same permissions as the category.`,
                        confirmText: "OK"
                    });
                    return;
                }

                Alerts.show({
                    title: "Sync Category Permissions",
                    body: `This will sync the permissions from category ${channel.name} to all ${channelsInCategory.length} channel${channelsInCategory.length === 1 ? "" : "s"} inside it.\n\nThis will overwrite any existing permission overrides on those channels. Are you sure you want to continue?`,
                    confirmText: "Sync Permissions",
                    cancelText: "Cancel",
                    confirmColor: "vc-sync-perms-danger-btn",
                    onConfirm: () => syncCategoryPermissions(channel.id)
                });
            }}
        />
    );
};

export default definePlugin({
    name: "syncCategoryPerms",
    description: "Adds a context menu option to sync permissions for all channels in a category",
    authors: [Devs.hackerboi],

    contextMenus: {
        "channel-context": ChannelContext
    }
});
