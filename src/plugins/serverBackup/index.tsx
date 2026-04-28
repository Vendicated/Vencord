/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
    sendBotMessage,
} from "@api/Commands";
import { DataStore } from "@api/index";
import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import {
    ChannelStore,
    GuildRoleStore,
    GuildStore,
    RestAPI,
    showToast,
    Toasts,
} from "@webpack/common";

interface BackupRole {
    name: string;
    color: number;
    hoist: boolean;
    permissions: string;
    mentionable: boolean;
    position: number;
    id: string;
}

interface BackupChannel {
    name: string;
    type: number;
    topic?: string;
    nsfw: boolean;
    parent_id?: string;
    position: number;
    permission_overwrites: any[];
    id: string;
    rate_limit_per_user?: number;
    bitrate?: number;
    user_limit?: number;
}

interface ServerBackup {
    id: string;
    name: string;
    icon?: string;
    description?: string;
    roles: BackupRole[];
    channels: BackupChannel[];
    timestamp: number;
}

const BACKUP_STORE_KEY = "ServerBackup_Backups";

// Function to backup a server
async function backupServer(guildId: string): Promise<string> {
    try {
        const guild = GuildStore.getGuild(guildId);
        if (!guild) {
            throw new Error("Server not found");
        }

        // Get roles
        const roles = GuildRoleStore.getSortedRoles(guildId);
        const backupRoles: BackupRole[] = roles
            .filter((role: any) => role.name !== "@everyone")
            .map((role: any) => ({
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                permissions: role.permissions,
                mentionable: role.mentionable,
                position: role.position,
                id: role.id,
            }));

        // Get ALL channels (text, voice, categories, etc.)
        const allChannels = ChannelStore.getMutableGuildChannelsForGuild(guildId);
        const backupChannels: BackupChannel[] = [];

        // Iterate through all server channels
        for (const [channelId, channelData] of Object.entries(allChannels)) {
            if (channelData && channelData.guild_id === guildId) {
                // Convert permissionOverwrites from Record to Array
                const permOverwrites = channelData.permissionOverwrites
                    ? Object.values(channelData.permissionOverwrites)
                    : [];

                backupChannels.push({
                    name: channelData.name,
                    type: channelData.type,
                    topic: channelData.topic,
                    nsfw: channelData.nsfw,
                    parent_id: channelData.parent_id,
                    position: channelData.position,
                    permission_overwrites: permOverwrites,
                    id: channelData.id,
                    rate_limit_per_user: channelData.rateLimitPerUser,
                    bitrate: channelData.bitrate,
                    user_limit: channelData.userLimit,
                });
            }
        }

        // Create the backup
        const backup: ServerBackup = {
            id: guildId,
            name: guild.name,
            icon: guild.icon,
            description: guild.description,
            roles: backupRoles,
            channels: backupChannels,
            timestamp: Date.now(),
        };

        // Save to DataStore
        const backups =
            (await DataStore.get<Record<string, ServerBackup>>(BACKUP_STORE_KEY)) ||
            {};
        const backupKey = `${guild.name}_${Date.now()}`;
        backups[backupKey] = backup;
        await DataStore.set(BACKUP_STORE_KEY, backups);

        return backupKey;
    } catch (error) {
        console.error("[ServerBackup] Error during backup:", error);
        throw error;
    }
}

// Function to restore a server
async function restoreServer(
    backupKey: string,
    targetGuildId: string
): Promise<void> {
    try {
        const guild = GuildStore.getGuild(targetGuildId);
        if (!guild) {
            throw new Error("Target server not found");
        }

        // Get the backup
        const backups = await DataStore.get<Record<string, ServerBackup>>(
            BACKUP_STORE_KEY
        );
        if (!backups || !backups[backupKey]) {
            throw new Error("Backup not found");
        }

        const backup = backups[backupKey];

        // STEP 1: Delete all existing channels
        const existingChannels =
            ChannelStore.getMutableGuildChannelsForGuild(targetGuildId);
        let deletedChannels = 0;

        for (const [channelId, channel] of Object.entries(existingChannels)) {
            try {
                await RestAPI.del({
                    url: `/channels/${channelId}`,
                });
                deletedChannels++;
                await new Promise((resolve) => setTimeout(resolve, 300));
            } catch (error) {
                console.error(
                    `[ServerBackup] Error deleting channel ${channel.name}:`,
                    error
                );
            }
        }

        console.log(`[ServerBackup] ${deletedChannels} channels deleted`);

        // STEP 2: Delete all existing roles (except @everyone)
        const existingRoles = GuildRoleStore.getSortedRoles(targetGuildId);
        let deletedRoles = 0;

        for (const role of existingRoles) {
            // Don't delete @everyone (the @everyone role id equals the server id)
            if (role.id === targetGuildId) continue;

            try {
                await RestAPI.del({
                    url: `/guilds/${targetGuildId}/roles/${role.id}`,
                });
                deletedRoles++;
                await new Promise((resolve) => setTimeout(resolve, 300));
            } catch (error) {
                console.error(
                    `[ServerBackup] Error deleting role ${role.name}:`,
                    error
                );
            }
        }

        console.log(`[ServerBackup] ${deletedRoles} roles deleted`);

        // STEP 3: Create new roles
        const roleMapping: Record<string, string> = {};
        for (const role of backup.roles) {
            try {
                const { body } = await RestAPI.post({
                    url: `/guilds/${targetGuildId}/roles`,
                    body: {
                        name: role.name,
                        permissions: role.permissions,
                        color: role.color,
                        hoist: role.hoist,
                        mentionable: role.mentionable,
                    },
                });
                roleMapping[role.id] = body.id;
                // Delay to avoid rate limit
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
                console.error(
                    `[ServerBackup] Error creating role ${role.name}:`,
                    error
                );
            }
        }

        // Create channels (categories first, then others)
        const categories = backup.channels.filter((c) => c.type === 4);
        const otherChannels = backup.channels.filter((c) => c.type !== 4);
        const channelMapping: Record<string, string> = {};

        // Create categories first
        for (const channel of categories) {
            try {
                const permissionOverwrites = channel.permission_overwrites.map(
                    (overwrite: any) => ({
                        ...overwrite,
                        id: roleMapping[overwrite.id] || overwrite.id,
                    })
                );

                const { body } = await RestAPI.post({
                    url: `/guilds/${targetGuildId}/channels`,
                    body: {
                        name: channel.name,
                        type: channel.type,
                        permission_overwrites: permissionOverwrites,
                    },
                });
                channelMapping[channel.id] = body.id;
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
                console.error(
                    `[ServerBackup] Error creating category ${channel.name}:`,
                    error
                );
            }
        }

        // Create other channels
        for (const channel of otherChannels) {
            try {
                const permissionOverwrites = channel.permission_overwrites.map(
                    (overwrite: any) => ({
                        ...overwrite,
                        id: roleMapping[overwrite.id] || overwrite.id,
                    })
                );

                const channelBody: any = {
                    name: channel.name,
                    type: channel.type,
                    permission_overwrites: permissionOverwrites,
                    parent_id: channelMapping[channel.parent_id!] || null,
                };

                if (channel.topic) channelBody.topic = channel.topic;
                if (channel.nsfw !== undefined) channelBody.nsfw = channel.nsfw;
                if (channel.rate_limit_per_user)
                    channelBody.rate_limit_per_user = channel.rate_limit_per_user;
                if (channel.bitrate) channelBody.bitrate = channel.bitrate;
                if (channel.user_limit) channelBody.user_limit = channel.user_limit;

                const { body } = await RestAPI.post({
                    url: `/guilds/${targetGuildId}/channels`,
                    body: channelBody,
                });
                channelMapping[channel.id] = body.id;
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
                console.error(
                    `[ServerBackup] Error creating channel ${channel.name}:`,
                    error
                );
            }
        }

        showToast(Toasts.Type.SUCCESS, "✅ Server restored successfully!");
    } catch (error) {
        console.error("[ServerBackup] Error during restoration:", error);
        throw error;
    }
}

// Function to list backups
async function listBackups(): Promise<string[]> {
    const backups =
        (await DataStore.get<Record<string, ServerBackup>>(BACKUP_STORE_KEY)) || {};
    return Object.keys(backups);
}

export default definePlugin({
    name: "ServerBackup",
    description:
        "Backs up and restores complete Discord server configuration (roles, channels, permissions) - No permissions required",
    authors: [ Devs.rz30,
        {
            name: "Bash",
            id: 1327483363518582784n,
        },

    ],
    dependencies: ["CommandsAPI"],

    commands: [
        {
            name: "backup",
            description: "Server backup management",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "save",
                    description: "Save a server's configuration",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "server_id",
                            description:
                                "Server ID to backup (leave empty for current server)",
                            type: ApplicationCommandOptionType.STRING,
                            required: false,
                        },
                    ],
                },
                {
                    name: "restore",
                    description: "Restore a backup to a server",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "backup_name",
                            description:
                                "Name of backup to restore (use /backup list to see backups)",
                            type: ApplicationCommandOptionType.STRING,
                            required: true,
                        },
                        {
                            name: "target_server_id",
                            description: "Target server ID (leave empty for current server)",
                            type: ApplicationCommandOptionType.STRING,
                            required: false,
                        },
                    ],
                },
                {
                    name: "list",
                    description: "List all available backups",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [],
                },
                {
                    name: "delete",
                    description: "Delete a backup",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "backup_name",
                            description: "Name of backup to delete",
                            type: ApplicationCommandOptionType.STRING,
                            required: true,
                        },
                    ],
                },
            ],
            execute: async (opts, ctx) => {
                try {
                    const subcommand = opts[0];
                    const subcommandName = subcommand.name;

                    if (subcommandName === "save") {
                        const serverIdOpt = subcommand.options?.find(
                            (opt) => opt.name === "server_id"
                        );
                        const serverId = (serverIdOpt?.value as string) || ctx.guild?.id;

                        if (!serverId) {
                            sendBotMessage(ctx.channel.id, {
                                content:
                                    "❌ You must specify a server ID or use this command in a server.",
                            });
                            return;
                        }

                        sendBotMessage(ctx.channel.id, {
                            content: "⏳ Backup in progress...",
                        });

                        const backupKey = await backupServer(serverId);

                        sendBotMessage(ctx.channel.id, {
                            content: `✅ Backup created successfully!\n**Name:** \`${backupKey}\`\n\nUse \`/backup restore ${backupKey}\` to restore this backup.`,
                        });
                    } else if (subcommandName === "restore") {
                        const backupNameOpt = subcommand.options?.find(
                            (opt) => opt.name === "backup_name"
                        );
                        const targetServerIdOpt = subcommand.options?.find(
                            (opt) => opt.name === "target_server_id"
                        );

                        const backupName = backupNameOpt?.value as string;
                        const targetServerId =
                            (targetServerIdOpt?.value as string) || ctx.guild?.id;

                        if (!backupName) {
                            sendBotMessage(ctx.channel.id, {
                                content: "❌ You must specify the backup name.",
                            });
                            return;
                        }

                        if (!targetServerId) {
                            sendBotMessage(ctx.channel.id, {
                                content:
                                    "❌ You must specify a target server ID or use this command in a server.",
                            });
                            return;
                        }

                        sendBotMessage(ctx.channel.id, {
                            content:
                                "⏳ Restoration in progress... This may take several minutes depending on server size.\n⚠️ **WARNING:** This action will DELETE all existing roles and channels and replace them with those from the backup!",
                        });

                        await restoreServer(backupName, targetServerId);

                        sendBotMessage(ctx.channel.id, {
                            content: "✅ Server restored successfully!",
                        });
                    } else if (subcommandName === "list") {
                        const backupKeys = await listBackups();

                        if (backupKeys.length === 0) {
                            sendBotMessage(ctx.channel.id, {
                                content:
                                    "ℹ️ No backups available.\n\nUse `/backup save` to create a backup.",
                            });
                            return;
                        }

                        const backups = await DataStore.get<Record<string, ServerBackup>>(
                            BACKUP_STORE_KEY
                        );
                        const backupList = backupKeys
                            .map((key) => {
                                const backup = backups![key];
                                const date = new Date(backup.timestamp);
                                return `**${key}**\n├ Server: ${backup.name}\n├ Roles: ${backup.roles.length
                                    }\n├ Channels: ${backup.channels.length
                                    }\n└ Date: ${date.toLocaleString()}`;
                            })
                            .join("\n\n");

                        sendBotMessage(ctx.channel.id, {
                            content: `📦 **Available backups:**\n\n${backupList}\n\nUse \`/backup restore <name>\` to restore a backup.`,
                        });
                    } else if (subcommandName === "delete") {
                        const backupNameOpt = subcommand.options?.find(
                            (opt) => opt.name === "backup_name"
                        );
                        const backupName = backupNameOpt?.value as string;

                        if (!backupName) {
                            sendBotMessage(ctx.channel.id, {
                                content: "❌ You must specify the backup name.",
                            });
                            return;
                        }

                        const backups = await DataStore.get<Record<string, ServerBackup>>(
                            BACKUP_STORE_KEY
                        );
                        if (!backups || !backups[backupName]) {
                            sendBotMessage(ctx.channel.id, {
                                content: `❌ Backup \`${backupName}\` not found.`,
                            });
                            return;
                        }

                        delete backups[backupName];
                        await DataStore.set(BACKUP_STORE_KEY, backups);

                        sendBotMessage(ctx.channel.id, {
                            content: `✅ Backup \`${backupName}\` deleted successfully.`,
                        });
                    }
                } catch (error) {
                    console.error("[ServerBackup] Error:", error);
                    const errorMessage =
                        error instanceof Error ? error.message : "An error occurred";
                    sendBotMessage(ctx.channel.id, {
                        content: `❌ **Error:** ${errorMessage}`,
                    });
                }
            },
        },
    ],

    start() {
        console.log("[ServerBackup] Plugin started");
    },

    stop() {
        console.log("[ServerBackup] Plugin stopped");
    },
});
