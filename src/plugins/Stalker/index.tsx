/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildStore, Menu, NavigationRouter, UserStore } from "@webpack/common"; // Added NavigationRouter

import { Devs } from "../../utils/constants";
import * as status from "./status";
import * as voice from "./voice";
import { initSharedTargets, addTarget as addSharedTarget, removeTarget as removeSharedTarget, isTarget, getTargets } from "./shared";

// Define the interface for your native module manually
export interface StalkerNative {
    getStalkerDataDir(): Promise<string>;
    readStalkerLog(): Promise<string>;
    writeStalkerLog(contents: string): Promise<void>;
}

// Access native module via global VencordNative
const Native = (window as any).VencordNative.pluginHelpers.Stalker as StalkerNative;

export interface StalkerLogEntry {
    timestamp: string;
    userId: string;
    username: string;
    action: "status_change" | "voice_join" | "voice_leave" | "message_send" | "typing_start" | "profile_update";
    details: string;
    channelName?: string;
    guildName?: string;
}

export const logger = new Logger("Stalker");

// Cache logs in memory
let cachedLogs: StalkerLogEntry[] = [];

async function loadLogsFromFile(): Promise<void> {
    if (!Native || !Native.readStalkerLog) return;
    try {
        const fileContents = await Native.readStalkerLog();
        if (fileContents) {
            const logs = JSON.parse(fileContents);
            cachedLogs = Array.isArray(logs) ? logs : [];
        } else {
            cachedLogs = [];
        }
    } catch (error) {
        logger.error("Failed to read stalker logs:", error);
        cachedLogs = [];
    }
}

export async function logStalkerEvent(entry: StalkerLogEntry) {
    try {
        if (!settings.store.enableLogging) return;
        if (!Native || !Native.writeStalkerLog) return;

        cachedLogs.push(entry);
        await Native.writeStalkerLog(JSON.stringify(cachedLogs, null, 2));
    } catch (error) {
        logger.error("Failed to write stalker log:", error);
    }
}

export let targets: string[] = [];

const parseTargets = (value: string): string[] => {
    targets = value.split(",").map(s => s.trim()).filter(Boolean);
    return targets;
};

export const settings = definePluginSettings({
    stalkContext: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Adds an option on the user context menu that enables stalking for users."
    },

    notifyCallJoin: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Send a notification when a user joins a call.",
    },

    notifyOffline: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Send a notification when a user goes offline."
    },

    notifyOnline: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Send a notification when a user goes online.",
    },

    notifyDnd: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Send a notification when a user goes on Do Not Disturb.",
    },

    notifyIdle: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Send a notification when a user goes on idle.",
    },

    notifyGoOnline: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Send a notification when a user logs onto Discord or leaves invisible.",
    },

    notifyOnMessage: {
        type: OptionType.BOOLEAN,
        default: true, // Changed to true so you see it working immediately
        description: "Send a notification when a user sends a message.",
    },

    enableLogging: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Enable logging of stalker events to a local file."
    },

    logMessages: {
        type: OptionType.BOOLEAN,
        default: true, // Defaulting to true for visibility
        description: "Log when a user sends a message in any channel.",
    },

    logTyping: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Log when a user starts typing (Discord only sends this if you are in the channel/DM).",
    },

    logProfileUpdates: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Log when a user updates their profile.",
    },

    targets: {
        type: OptionType.STRING,
        placeholder: "1234567890, 0987654321",
        description: "List of user IDs to stalk, separate with a comma.",
        default: "",
        onChange: parseTargets,
    },
});

const patchUserContext: NavContextMenuPatchCallback = (children, { user }: { user: any; }) => {
    if (!settings.store.stalkContext) return;
    if (!user) return;

    const stalked = isTarget(user.id);
    const group = findGroupChildrenByChildId("apps", children) ?? children;

    let id = group.findIndex(child => child?.props?.id === "ignore");
    if (id < 0) id = group.length - 1;

    group.splice(id, 0,
        <Menu.MenuItem
            id="vc-st-stalk"
            label={stalked ? "Unstalk" : "Stalk"}
            action={() => {
                if (stalked) {
                    removeSharedTarget(user.id);
                } else {
                    addSharedTarget(user.id);
                }
                parseTargets(settings.store.targets);
            }}
        />
    );
};

export default definePlugin({
    name: "Stalker",
    description: "Notifies you whenever a target user changes status, joins VC, or sends a message. (fixed by x2b)",
    authors: [Devs.rz30,{ name: "Reycko", id: 1123725368004726794n }, ],

    contextMenus: {
        "user-context": patchUserContext,
    },

    async start() {
        initSharedTargets(settings.store);
        parseTargets(settings.store.targets);
        if (settings.store.enableLogging) {
            await loadLogsFromFile();
        }
        status.init();
        voice.init();
        logger.info("Stalker started. Monitoring targets:", targets);
    },

    stop() {
        status.deinit();
        voice.deinit();
    },

    flux: {
        // Removed 'async' from these functions to ensure Vencord Flux handles them correctly
        MESSAGE_CREATE({ message, optimistic, type, channelId }: { message: any; optimistic: boolean; type: string; channelId: string; }) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!getTargets().includes(message.author.id)) return;

            const user = UserStore.getUser(message.author.id) || message.author;
            if (!user) return;

            const channel = ChannelStore.getChannel(message.channel_id);
            const guild = channel?.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
            const channelName = channel
                ? (guild ? `${guild.name} > #${channel.name}` : `DM > ${channel.name}`)
                : "Unknown Channel";

            logger.info(`[Stalker] Message from ${user.username}: ${message.content}`);

            // 1. Log to file
            if (settings.store.logMessages) {
                logStalkerEvent({
                    timestamp: new Date().toISOString(),
                    userId: user.id,
                    username: user.username,
                    action: "message_send",
                    details: `Sent message: ${message.content.substring(0, 100)}${message.content.length > 100 ? "..." : ""}`,
                    channelName: channel?.name,
                    guildName: guild?.name
                });
            }

            // 2. Show Notification
            if (settings.store.notifyOnMessage) {
                showNotification({
                    title: "Stalker - New Message",
                    body: `${user.username} sent a message in ${channelName}:\n${message.content.substring(0, 50)}...`,
                    icon: user.getAvatarURL(void 0, 128, true),
                    onClick: () => {
                        if (channel) {
                            const loc = channel.guild_id
                                ? `/channels/${channel.guild_id}/${channel.id}`
                                : `/channels/@me/${channel.id}`;
                            NavigationRouter.transitionTo(loc);
                        }
                    }
                });
            }
        },

        TYPING_START({ userId, channelId }: { userId: string, channelId: string; }) {
            if (!settings.store.logTyping) return;
            if (!getTargets().includes(userId)) return;

            const user = UserStore.getUser(userId);
            if (!user) return;

            // Discord only sends TYPING_START for channels you are currently viewing or DMs.
            logger.info(`[Stalker] ${user.username} is typing...`);

            const channel = ChannelStore.getChannel(channelId);
            const guild = channel?.guild_id ? GuildStore.getGuild(channel.guild_id) : null;

            logStalkerEvent({
                timestamp: new Date().toISOString(),
                userId: user.id,
                username: user.username,
                action: "typing_start",
                details: "Started typing",
                channelName: channel?.name,
                guildName: guild?.name
            });
        },

        // Covers avatar updates, nickname changes in guilds
        GUILD_MEMBER_UPDATE({ member, guildId }: { member: any; guildId: string; }) {
            if (!settings.store.logProfileUpdates) return;
            if (!member || !member.user) return;
            if (!getTargets().includes(member.user.id)) return;

            const guild = GuildStore.getGuild(guildId);
            const { user } = member;

            logger.info(`[Stalker] Profile Update for ${user.username} in ${guild?.name}`);

            logStalkerEvent({
                timestamp: new Date().toISOString(),
                userId: user.id,
                username: user.username,
                action: "profile_update",
                details: `Guild Member Update in ${guild?.name}`,
                guildName: guild?.name
            });
        },

        // Covers global profile updates (mostly for self/friends)
        USER_UPDATE({ user }: { user: any; }) {
            if (!settings.store.logProfileUpdates) return;
            if (!getTargets().includes(user.id)) return;

            const existingUser = UserStore.getUser(user.id);
            // Only log if we actually have data to compare, or just log it anyway
            logger.info(`[Stalker] User Update for ${user.username}`);

            logStalkerEvent({
                timestamp: new Date().toISOString(),
                userId: user.id,
                username: user.username,
                action: "profile_update",
                details: "User Updated"
            });
        },
    },

    settings,
});
