/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
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
let kickCache = new Set<string>();

const settings = definePluginSettings({
    muteUser: {
        type: OptionType.BOOLEAN,
        description: "Server Mute blacklisted users",
        default: true,
    },
    deafenUser: {
        type: OptionType.BOOLEAN,
        description: "Server Deafen blacklisted users",
        default: true,
    },
    disconnectUser: {
        type: OptionType.BOOLEAN,
        description: "Disconnect blacklisted users from channel",
        default: true,
    },
    monitorSpeed: {
        type: OptionType.SLIDER,
        description: "Monitor check interval (milliseconds)",
        default: 100,
        markers: [50, 100, 250, 500, 1000],
        stickToMarkers: true,
    },
});

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

function kickUserWithSettings(guildId: string, userId: string, channelId: string) {
    const cacheKey = `${userId}-${channelId}`;
    if (kickCache.has(cacheKey)) {
        return;
    }
    
    if (!isBlacklisted(userId, channelId)) {
        return;
    }
    
    kickCache.add(cacheKey);
    
    const actions: Promise<any>[] = [];
    

    if (settings.store.muteUser || settings.store.deafenUser) {
        const body: any = {};
        if (settings.store.muteUser) body.mute = true;
        if (settings.store.deafenUser) body.deaf = true;
        
        actions.push(
            RestAPI.patch({
                url: `/guilds/${guildId}/members/${userId}`,
                body: body
            }).catch(() => {})
        );
    }
    
    if (settings.store.disconnectUser) {
        setTimeout(() => {
            RestAPI.patch({
                url: `/guilds/${guildId}/members/${userId}`,
                body: { channel_id: null }
            }).catch(() => {});
        }, 100);
    }
    
    Promise.all(actions).then(() => {
        setTimeout(() => kickCache.delete(cacheKey), 1000);
    }).catch(() => {
        kickCache.delete(cacheKey);
    });
    
    console.log("[VCBlacklist] Actions applied to:", userId);
}

function isBlacklisted(userId: string, channelId: string): boolean {
    return blacklist.some(e => e.userId === userId && e.channelId === channelId);
}

function addBlacklist(userId: string, channelId: string) {
    if (!isBlacklisted(userId, channelId)) {
        blacklist.push({ userId, channelId });
        console.log("[VCBlacklist] Added:", userId, channelId);
    }
}

function removeBlacklist(userId: string, channelId: string) {
    const beforeLength = blacklist.length;
    blacklist = blacklist.filter(e => !(e.userId === userId && e.channelId === channelId));
    console.log("[VCBlacklist] Removed:", userId, channelId);
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
                        kickUserWithSettings(channel.guild_id, userId, channelId);
                    }
                }
            }
        }
    } catch {}
}

function startMonitoring() {
    if (monitorInterval) return;
    
    const interval = settings.store.monitorSpeed;
    monitorInterval = setInterval(monitorBlacklist, interval);
    console.log(`[VCBlacklist] Monitoring started (${interval}ms)`);
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
                        kickUserWithSettings(voiceChannel.guild_id, user.id, channelId);
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
    description: "Block users from voice channels with customizable actions",
    authors: [Devs.pluckerpilple],
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
                        kickUserWithSettings(channel.guild_id, userId, channelId);
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
