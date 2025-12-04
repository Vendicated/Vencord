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

async function syncChannelWithRetry(channelId: string, permissionOverwrites: any, maxRetries = 3): Promise<boolean> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await RestAPI.patch({
                url: Constants.Endpoints.CHANNEL(channelId),
                body: {
                    permission_overwrites: Object.values(permissionOverwrites)
                }
            });
            return true;
        } catch (error: any) {
            // If rate limited, wait longer before retrying
            if (error?.status === 429 && attempt < maxRetries - 1) {
                const retryAfter = error.body?.retry_after ? error.body.retry_after * 1000 : 2000;
                await new Promise(resolve => setTimeout(resolve, retryAfter));
                continue;
            }

            // For other errors or final retry, fail
            if (attempt === maxRetries - 1) {
                console.error(`Failed to sync channel ${channelId} after ${maxRetries} attempts:`, error);
                return false;
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
    return false;
}

function getChannelsInCategory(categoryId: string): any[] {
    const category = ChannelStore.getChannel(categoryId);
    if (!category || !category.isCategory()) return [];

    const allChannels = Object.values(ChannelStore.getMutableGuildChannelsForGuild(category.guild_id));
    return allChannels.filter((channel: any) => channel.parent_id === categoryId);
}

async function syncCategoryPermissions(categoryId: string) {
    const category = ChannelStore.getChannel(categoryId);
    if (!category || !category.isCategory()) {
        showToast("Invalid category", Toasts.Type.FAILURE);
        return;
    }
    if (!category || !category.isCategory()) return;

    const categoryPermissions = category.permissionOverwrites;
    const channelsInCategory = getChannelsInCategory(categoryId);

    if (channelsInCategory.length === 0) {
        showToast("No channels found in this category", Toasts.Type.MESSAGE);
        return;
    }

    // Only sync channels that need updating
    const unsyncedChannels = channelsInCategory.filter(channel =>
        !permissionsMatch(channel.permissionOverwrites, categoryPermissions)
    );

    if (unsyncedChannels.length === 0) {
        showToast("All channels already have matching permissions", Toasts.Type.MESSAGE);
        return;
    }

    let successCount = 0;
    let failCount = 0;
    const totalChannels = unsyncedChannels.length;

    // Process channels in batches to avoid rate limiting
    const batchSize = 3;
    const delayBetweenBatches = 1000; // 1 second

    for (let i = 0; i < unsyncedChannels.length; i += batchSize) {
        const batch = unsyncedChannels.slice(i, i + batchSize);
        const currentProgress = Math.min(i + batchSize, totalChannels);

        // Show progress toast
        showToast(
            `Syncing permissions... ${currentProgress}/${totalChannels} channels`,
            Toasts.Type.MESSAGE,
            { duration: 1000 }
        );

        const results = await Promise.allSettled(
            batch.map(channel =>
                syncChannelWithRetry(channel.id, categoryPermissions)
            )
        );

        results.forEach(result => {
            if (result.status === "fulfilled" && result.value) {
                successCount++;
            } else {
                failCount++;
            }
        });

        // Don't delay after the last batch
        if (i + batchSize < unsyncedChannels.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }

    console.log(`[syncCategoryPerms] Sync complete: ${successCount} succeeded, ${failCount} failed out of ${totalChannels} total channels`);

    if (failCount === 0) {
        showToast(
            `Successfully synced permissions for all ${successCount} channel${successCount === 1 ? "" : "s"}!`,
            Toasts.Type.SUCCESS
        );
    } else {
        showToast(
            `Synced ${successCount} channel${successCount === 1 ? "" : "s"}, ${failCount} failed. Check console for details.`,
            Toasts.Type.FAILURE
        );
    }
}

const ChannelContext: NavContextMenuPatchCallback = (children, { channel }) => {
    // Only show for categories where user has manage channels permission
    if (!channel || !channel.isCategory()) return;

    const canManage = PermissionStore.can(PermissionsBits.MANAGE_CHANNELS, channel);
    if (!canManage) return;

    children.splice(-1, 0,
        <Menu.MenuItem
            id="sync-category-perms"
            label="Sync Permissions to All Channels"
            action={() => {
                const channelsInCategory = getChannelsInCategory(channel.id);

                if (channelsInCategory.length === 0) {
                    showToast("No channels found in this category", Toasts.Type.MESSAGE);
                    return;
                }

                // Check how many channels need updating
                const categoryPermissions = channel.permissionOverwrites;
                const unsyncedChannels = channelsInCategory.filter((ch: any) =>
                    !permissionsMatch(ch.permissionOverwrites, categoryPermissions)
                );

                if (unsyncedChannels.length === 0) {
                    Alerts.show({
                        title: "Permissions Already Synced",
                        body: `All ${channelsInCategory.length} channel${channelsInCategory.length === 1 ? "" : "s"} in ${channel.name} already have the same permissions as the category.`,
                        confirmText: "OK"
                    });
                    return;
                }

                Alerts.show({
                    title: "Sync Category Permissions",
                    body: `This will sync all ${channelsInCategory.length} channel${channelsInCategory.length === 1 ? "" : "s"} in ${channel.name}. ${unsyncedChannels.length} channel${unsyncedChannels.length === 1 ? "" : "s"} will have ${unsyncedChannels.length === 1 ? "its" : "their"} permissions updated.\n\nThis will overwrite any existing permission overrides. Are you sure you want to continue?`,
                    confirmText: "Sync Permissions",
                    cancelText: "Cancel",
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
