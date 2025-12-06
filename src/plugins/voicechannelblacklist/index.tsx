/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Alerts, ChannelStore, Menu, PermissionStore, RestAPI, UserStore } from "@webpack/common";

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
}

interface VoiceStateStore {
    getAllVoiceStates(): { [guildId: string]: { [userId: string]: VoiceState } };
    getVoiceStatesForChannel(channelId: string): { [userId: string]: VoiceState };
}

const VoiceStateStore: VoiceStateStore = findStoreLazy("VoiceStateStore");

interface BlacklistEntry {
    userId: string;
    channelId: string;
}

let blacklist: BlacklistEntry[] = [];
let monitorInterval: NodeJS.Timeout | null = null;
let kickCache = new Set<string>(); // Cache to prevent duplicate kicks

const settings = definePluginSettings({});

function hasPerms(channelId: string): boolean {
    try {
        const MUTE = 1n << 22n;
        const DEAFEN = 1n << 23n;
        const MOVE = 1n << 24n;
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return false;
        return PermissionStore.can(MUTE | DEAFEN | MOVE, channel);
    } catch {
        return false;
    }
}

function disconnectInstant(guildId: string, userId: string, channelId: string) {
    // Check cache to prevent spam
    const cacheKey = `${userId}-${channelId}`;
    if (kickCache.has(cacheKey)) {
        console.log("[VCBlacklist] Already kicking, skip:", userId);
        return;
    }
    
    // Check if still blacklisted before disconnect
    if (!isBlacklisted(userId, channelId)) {
        console.log("[VCBlacklist] User removed from blacklist, skip disconnect:", userId);
        return;
    }
    
    kickCache.add(cacheKey);
    
    // PRIORITY 1: DISCONNECT IMMEDIATELY
    RestAPI.patch({
        url: `/guilds/${guildId}/members/${userId}`,
        body: { channel_id: null }
    }).then(() => {
        console.log("[VCBlacklist] DISCONNECT SUCCESS:", userId);
        // Remove from cache after 1 second
        setTimeout(() => kickCache.delete(cacheKey), 1000);
    }).catch((err) => {
        console.error("[VCBlacklist] DISCONNECT ERROR:", err);
        kickCache.delete(cacheKey);
    });
    
    // Then mute and deafen
    setTimeout(() => {
        if (isBlacklisted(userId, channelId)) {
            RestAPI.patch({
                url: `/guilds/${guildId}/members/${userId}`,
                body: { mute: true, deaf: true }
            }).catch(() => {});
        }
    }, 100);
}

function isBlacklisted(userId: string, channelId: string): boolean {
    const result = blacklist.some(e => e.userId === userId && e.channelId === channelId);
    return result;
}

function addBlacklist(userId: string, channelId: string) {
    if (!isBlacklisted(userId, channelId)) {
        blacklist.push({ userId, channelId });
        console.log("[VCBlacklist] ADDED to blacklist:", userId, channelId, "Total:", blacklist.length);
    }
}

function removeBlacklist(userId: string, channelId: string) {
    const beforeLength = blacklist.length;
    blacklist = blacklist.filter(e => !(e.userId === userId && e.channelId === channelId));
    const afterLength = blacklist.length;
    console.log("[VCBlacklist] REMOVED from blacklist:", userId, channelId, "Before:", beforeLength, "After:", afterLength);
    
    // Clear kick cache for this user
    kickCache.delete(`${userId}-${channelId}`);
}

function getUserChannelId(userId: string): string | null {
    try {
        const states = VoiceStateStore.getAllVoiceStates();
        for (const users of Object.values(states)) {
            if (users[userId]) {
                return users[userId].channelId ?? null;
            }
        }
    } catch {}
    return null;
}

function monitorBlacklist() {
    try {
        if (blacklist.length === 0) return;
        
        const allStates = VoiceStateStore.getAllVoiceStates();
        const currentBlacklist = [...blacklist];
        
        for (const entry of currentBlacklist) {
            const { userId, channelId } = entry;
            
            if (!isBlacklisted(userId, channelId)) {
                continue;
            }
            
            for (const [guildId, users] of Object.entries(allStates)) {
                const userState = users[userId];
                
                if (userState && userState.channelId === channelId) {
                    const channel = ChannelStore.getChannel(channelId);
                    if (channel && hasPerms(channelId)) {
                        disconnectInstant(channel.guild_id, userId, channelId);
                    }
                }
            }
        }
    } catch {}
}

function startMonitoring() {
    if (monitorInterval) return;
    
    monitorInterval = setInterval(monitorBlacklist, 100);
    console.log("[VCBlacklist] Monitoring started (100ms)");
}

function stopMonitoring() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
        console.log("[VCBlacklist] Monitoring stopped");
    }
}

const UserContext: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;
    
    const channelId = getUserChannelId(user.id);
    if (!channelId) return;
    
    const voiceChannel = ChannelStore.getChannel(channelId);
    if (!voiceChannel || voiceChannel.type !== 2) return;
    
    if (!hasPerms(channelId)) return;

    const blacklisted = isBlacklisted(user.id, channelId);

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="vc-blacklist"
                label={blacklisted ? "Remove from Voice Blacklist" : "Voice Blacklist"}
                color={blacklisted ? "danger" : undefined}
                action={() => {
                    if (blacklisted) {
                        Alerts.show({
                            title: "Remove from Voice Blacklist",
                            body: `Are you sure you want to remove ${user.username} from blacklist for ${voiceChannel.name}?`,
                            confirmText: "Remove",
                            cancelText: "Cancel",
                            confirmColor: "red",
                            onConfirm: () => removeBlacklist(user.id, channelId)
                        });
                    } else {
                        addBlacklist(user.id, channelId);
                        disconnectInstant(voiceChannel.guild_id, user.id, channelId);
                    }
                }}
            />
        </Menu.MenuGroup>
    ));
};

const ChannelContext: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel || channel.type !== 2 || !channel.guild_id) return;
    
    if (!hasPerms(channel.id)) return;

    const list = blacklist.filter(e => e.channelId === channel.id);
    if (list.length === 0) return;

    const items = list.map(entry => {
        const user = UserStore.getUser(entry.userId);
        const name = user?.username || entry.userId;
        
        return (
            <Menu.MenuItem
                key={entry.userId}
                id={`bl-${entry.userId}`}
                label={name}
                color="danger"
                action={() => {
                    Alerts.show({
                        title: "Remove from Blacklist",
                        body: `Are you sure you want to remove ${name} from the blacklist?`,
                        confirmText: "Remove",
                        cancelText: "Cancel",
                        confirmColor: "red",
                        onConfirm: () => removeBlacklist(entry.userId, channel.id)
                    });
                }}
            />
        );
    });

    items.push(<Menu.MenuSeparator key="sep" />);
    items.push(
        <Menu.MenuItem
            key="rm-all"
            id="rm-all"
            label="Remove All"
            color="danger"
            action={() => {
                Alerts.show({
                    title: "Remove All Users",
                    body: `Are you sure you want to remove all ${list.length} users from the blacklist?`,
                    confirmText: "Remove All",
                    cancelText: "Cancel",
                    confirmColor: "red",
                    onConfirm: () => list.forEach(e => removeBlacklist(e.userId, channel.id))
                });
            }}
        />
    );

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem id="vc-bl-list" label="Voice Blacklist">
                {items}
            </Menu.MenuItem>
        </Menu.MenuGroup>
    ));
};

export default definePlugin({
    name: "VoiceChannelBlacklist",
    description: "Instantly kick specific users from voice channels. Right-click a user to blacklist them - they'll be auto-kicked every time they try to join that channel. Perfect for keeping trolls out of your voice rooms.",
    authors: [Devs.viciouscal],
    settings,

    start() {
        console.log("[VCBlacklist] Plugin started");
        startMonitoring();
    },

    stop() {
        console.log("[VCBlacklist] Plugin stopped");
        stopMonitoring();
        blacklist = [];
        kickCache.clear();
    },

    contextMenus: {
        "user-context": UserContext,
        "channel-context": ChannelContext
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[] }) {
            if (!voiceStates) return;
            
            for (const { userId, channelId } of voiceStates) {
                if (!channelId || userId === UserStore.getCurrentUser()?.id) continue;
                
                if (isBlacklisted(userId, channelId)) {
                    const channel = ChannelStore.getChannel(channelId);
                    if (channel && hasPerms(channelId)) {
                        console.log("[VCBlacklist] Flux event detected blacklisted user:", userId);
                        disconnectInstant(channel.guild_id, userId, channelId);
                    }
                }
            }
        },

        CHANNEL_DELETE({ channel }: { channel: { id: string; type: number } }) {
            if (channel?.type === 2 && channel?.id) {
                blacklist = blacklist.filter(e => e.channelId !== channel.id);
                console.log("[VCBlacklist] Channel deleted, cleaned blacklist");
            }
        }
    }
});