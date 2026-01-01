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

let pullList: string[] = [];
let lastMyChannelId: string | null = null;
let monitorInterval: NodeJS.Timeout | null = null;
let pullCache = new Map<string, number>(); // userId -> timestamp

const settings = definePluginSettings({});

function hasMovePerm(channelId: string): boolean {
    try {
        const MOVE = 1n << 24n;
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return false;
        return PermissionStore.can(MOVE, channel);
    } catch {
        return false;
    }
}

function isPulled(userId: string): boolean {
    return pullList.includes(userId);
}

function addToPullList(userId: string) {
    if (!isPulled(userId)) {
        pullList.push(userId);
        console.log("[PullUser] Added:", userId, "Total:", pullList.length);
    }
}

function removeFromPullList(userId: string) {
    pullList = pullList.filter(id => id !== userId);
    console.log("[PullUser] Removed:", userId);
}

function getMyChannelId(): string | null {
    const myId = UserStore.getCurrentUser()?.id;
    if (!myId) return null;

    try {
        const states = VoiceStateStore.getAllVoiceStates();
        for (const users of Object.values(states)) {
            if (users[myId]?.channelId) {
                return users[myId].channelId;
            }
        }
    } catch {}
    return null;
}

function pullUserInstant(guildId: string, userId: string, targetChannelId: string) {
    const now = Date.now();
    const cacheKey = `${userId}-${targetChannelId}`;
    const lastPull = pullCache.get(cacheKey);

    // Don't pull same user to same channel within 5 seconds (increased from 2)
    if (lastPull && (now - lastPull) < 5000) {
        return;
    }

    pullCache.set(cacheKey, now);

    RestAPI.patch({
        url: `/guilds/${guildId}/members/${userId}`,
        body: { channel_id: targetChannelId }
    }).catch(() => {});
}

function monitorAndPull() {
    try {
        // Get my current channel
        const myChannelId = getMyChannelId();

        if (!myChannelId) {
            lastMyChannelId = null;
            return;
        }

        // Update last known channel
        lastMyChannelId = myChannelId;

        const channel = ChannelStore.getChannel(myChannelId);
        if (!channel || !hasMovePerm(myChannelId)) return;

        // Get all voice states
        const allStates = VoiceStateStore.getAllVoiceStates();

        // Pull anyone not in my channel
        for (const userId of pullList) {
            let userChannelId: string | null = null;

            for (const users of Object.values(allStates)) {
                if (users[userId]?.channelId) {
                    userChannelId = users[userId].channelId;
                    break;
                }
            }

            // If user is in a different channel, pull them
            if (userChannelId && userChannelId !== myChannelId) {
                pullUserInstant(channel.guild_id, userId, myChannelId);
                console.log("[PullUser] Monitor pulled:", userId);
            }
        }
    } catch {}
}

function startMonitoring() {
    if (monitorInterval) return;

    // Check every 1 second to avoid Discord rate limiting
    monitorInterval = setInterval(monitorAndPull, 1000);
    console.log("[PullUser] Monitoring started (1000ms)");
}

function stopMonitoring() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
        console.log("[PullUser] Monitoring stopped");
    }
}

const UserContext: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;

    const pulled = isPulled(user.id);

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="pull-user"
                label={pulled ? "خله ينقلع بس" : "ربط مع رجلينه"}
                color={pulled ? "danger" : undefined}
                action={() => {
                    if (pulled) {
                        Alerts.show({
                            title: "ياخي فكه يا دبشه",
                            body: `كمل يا رجال ما عليك  ${user.username} اما تبي تكمل جدول على ؟`,
                            confirmText: "لا برحمه",
                            cancelText: "بكمل عليهم المهطف",
                            confirmColor: "red",
                            onConfirm: () => removeFromPullList(user.id)
                        });
                    } else {
                        addToPullList(user.id);
                    }
                }}
            />
        </Menu.MenuGroup>
    ));
};

const ChannelContext: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel || channel.type !== 2 || !channel.guild_id) return;

    if (pullList.length === 0) return;

    const items = pullList.map(userId => {
        const user = UserStore.getUser(userId);
        const name = user?.username || userId;

        return (
            <Menu.MenuItem
                key={userId}
                id={`pull-${userId}`}
                label={name}
                color="danger"
                action={() => {
                    Alerts.show({
                        title: "ارحمه المسكين يكسر الخاطر",
                        body: `  ما عليك يا رجال ${name}كمل جدول على ذا`,
                        confirmText: "لا برحمه",
                        cancelText: "خله يزعل وش دخلني",
                        confirmColor: "red",
                        onConfirm: () => removeFromPullList(userId)
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
            label="ارحمهم"
            color="danger"
            action={() => {
                Alerts.show({
                    title: "فكهم كلهم يا بطل",
                    body: `ما تبي تكمل جدول على ${pullList.length}الرجيلي؟`,
                    confirmText: "فكهم من شرك",
                    cancelText: "Cancel",
                    confirmColor: "red",
                    onConfirm: () => {
                        pullList = [];
                        console.log("[PullUser] Cleared pull list");
                    }
                });
            }}
        />
    );

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem id="pull-list" label="علشاني">
                {items}
            </Menu.MenuItem>
        </Menu.MenuGroup>
    ));
};

export default definePlugin({
    name: "سحب بربرلي ؟",
    description: "Drag users with you across voice channels. Right-click users to add them to your pull list - they'll automatically follow you whenever you switch voice channels. Like having your own personal entourage.",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }],
    settings,

    start() {
        console.log("[PullUser] Starting with aggressive monitoring");
        lastMyChannelId = getMyChannelId();
        startMonitoring();
    },

    stop() {
        console.log("[PullUser] Stopping");
        stopMonitoring();
        pullList = [];
        lastMyChannelId = null;
        pullCache.clear();
    },

    contextMenus: {
        "user-context": UserContext,
        "channel-context": ChannelContext
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[] }) {
            if (!voiceStates || voiceStates.length === 0) return;

            const myId = UserStore.getCurrentUser()?.id;
            if (!myId) return;

            for (const state of voiceStates) {
                if (state.userId === myId) {
                    const newChannel = state.channelId;

                    if (newChannel && newChannel !== lastMyChannelId) {
                        console.log("[PullUser] Flux detected move to:", newChannel);
                        lastMyChannelId = newChannel;

                        // Instant pull on flux event
                        monitorAndPull();
                    } else if (!newChannel) {
                        lastMyChannelId = null;
                    }
                    break;
                }
            }
        }
    }
});
