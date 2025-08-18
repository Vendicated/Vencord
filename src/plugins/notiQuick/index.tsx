/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { DeleteIcon, NotesIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, ContextMenuApi, FluxDispatcher, GuildChannelStore, GuildStore, Menu, ReadStateStore, Toasts } from "@webpack/common";

const ActiveJoinedThreadsStore = findByPropsLazy("getActiveJoinedThreadsForGuild");

const settings = definePluginSettings({
    showIcons: {
        type: OptionType.BOOLEAN,
        description: "Show icons in context menu",
        default: true
    },
    showCounts: {
        type: OptionType.BOOLEAN,
        description: "Show notification counts in context menu",
        default: true
    },
    bellAnimation: {
        type: OptionType.BOOLEAN,
        description: "Enable bell icon animation when clicking notifications button",
        default: true
    }
});

const BUTTON_SELECTOR = '[data-list-item-id="guildsnav___notifications-inbox"]';
const MIN_CLICK_INTERVAL = 300;

let lastClickTs = 0;

interface AckChannelPayload {
    channelId: string;
    messageId: string | null;
    readStateType: number;
}

function animateBellIcon(rootEl: HTMLElement) {
    if (!settings.store.bellAnimation) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const svg = rootEl.querySelector("svg");
    if (!svg) return;

    svg.style.animation = "bell 0.45s cubic-bezier(0.4, 0, 0.2, 1)";
    setTimeout(() => svg.style.animation = "", 450);
}

function collectUnreadChannels(guildId?: string): AckChannelPayload[] {
    try {
        const acks: AckChannelPayload[] = [];
        const guilds = guildId ? { [guildId]: GuildStore.getGuild(guildId) } : GuildStore.getGuilds();

        if (!guilds) return acks;

        for (const guild of Object.values(guilds)) {
            if (!guild?.id) continue;

            try {
                const guildChannels = GuildChannelStore.getChannels(guild.id);
                if (!guildChannels) continue;

                const pushIfUnread = (id: string) => {
                    try {
                        if (id && ReadStateStore.hasUnread(id)) {
                            acks.push({
                                channelId: id,
                                messageId: ReadStateStore.lastMessageId(id),
                                readStateType: 0
                            });
                        }
                    } catch (error) {
                        console.warn("[NotiQuick] Error checking unread status for channel:", id, error);
                    }
                };

                guildChannels.SELECTABLE?.forEach(c => c?.channel?.id && pushIfUnread(c.channel.id));
                guildChannels.VOCAL?.forEach(c => c?.channel?.id && pushIfUnread(c.channel.id));

                try {
                    const threadsByParent = ActiveJoinedThreadsStore.getActiveJoinedThreadsForGuild(guild.id);
                    if (threadsByParent) {
                        for (const threadGroup of Object.values(threadsByParent)) {
                            if (threadGroup && typeof threadGroup === "object") {
                                for (const thread of Object.values(threadGroup as Record<string, any>)) {
                                    if (thread?.channel?.id) {
                                        pushIfUnread(thread.channel.id);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn("[NotiQuick] Error processing threads for guild:", guild.id, error);
                }
            } catch (error) {
                console.warn("[NotiQuick] Error processing guild:", guild.id, error);
            }
        }
        return acks;
    } catch (error) {
        console.error("[NotiQuick] Error collecting unread channels:", error);
        return [];
    }
}

function collectUnreadDMs(): AckChannelPayload[] {
    try {
        const channels = ChannelStore.getSortedPrivateChannels();
        if (!channels || !Array.isArray(channels)) return [];

        return channels
            .filter(channel => {
                try {
                    return channel?.id && ReadStateStore.hasUnread(channel.id);
                } catch (error) {
                    console.warn("[NotiQuick] Error checking unread status for DM:", channel?.id, error);
                    return false;
                }
            })
            .map(channel => ({
                channelId: channel.id,
                messageId: ReadStateStore.lastMessageId(channel.id),
                readStateType: 0
            }));
    } catch (error) {
        console.error("[NotiQuick] Error collecting unread DMs:", error);
        return [];
    }
}

function getNotificationCounts() {
    const serverChannels = collectUnreadChannels();
    const dmChannels = collectUnreadDMs();

    const unreadServerIds = new Set<string>();
    for (const channel of serverChannels) {
        const guildId = ChannelStore.getChannel(channel.channelId)?.guild_id;
        if (guildId) unreadServerIds.add(guildId);
    }

    return {
        servers: unreadServerIds.size,
        dms: dmChannels.length,
        serverChannels,
        dmChannels
    };
}

async function markAsRead(channels: AckChannelPayload[], type: "all" | "dms" = "all") {
    if (channels.length === 0) {
        Toasts.show({
            message: "No unread channels found",
            type: Toasts.Type.MESSAGE,
            id: "notif-plus-no-unread"
        });
        return;
    }

    const message = type === "dms" ?
        `Marked ${channels.length} DM${channels.length === 1 ? "" : "s"} as read` :
        `Marked ${channels.length} notification${channels.length === 1 ? "" : "s"} as read`;

    FluxDispatcher.dispatch({ type: "BULK_ACK", context: "APP", channels });

    Toasts.show({
        message,
        type: Toasts.Type.SUCCESS,
        id: "notif-plus-mark-read"
    });
}

async function onClick(channels: AckChannelPayload[], type: "all" | "dms") {
    const now = Date.now();
    if (now - lastClickTs < MIN_CLICK_INTERVAL) return;
    lastClickTs = now;

    await markAsRead(channels, type);
}

function attachToNotificationsButton(onContext: (e: MouseEvent) => void, onBellClick: () => void): () => void {
    const host = document.querySelector(BUTTON_SELECTOR) as HTMLElement;
    if (!host) return () => { };

    const handleClick = (e: MouseEvent) => e.button === 0 && onBellClick();
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onContext(e);
    };

    host.addEventListener("click", handleClick);
    host.addEventListener("contextmenu", handleContextMenu);

    return () => {
        host.removeEventListener("click", handleClick);
        host.removeEventListener("contextmenu", handleContextMenu);
    };
}

function observeAndAttach(onContext: (e: MouseEvent) => void, onBellClick: () => void): () => void {
    let detachCurrent: (() => void) | null = null;
    let currentHost: HTMLElement | null = null;

    const reconcile = () => {
        const host = document.querySelector(BUTTON_SELECTOR) as HTMLElement;
        if (host && host !== currentHost) {
            detachCurrent?.();
            currentHost = host;
            detachCurrent = attachToNotificationsButton(onContext, onBellClick);
        } else if (!host && detachCurrent) {
            detachCurrent();
            detachCurrent = null;
            currentHost = null;
        }
    };

    reconcile();
    const mo = new MutationObserver(reconcile);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
        detachCurrent?.();
        mo.disconnect();
    };
}

export default definePlugin({
    name: "NotiQuick",
    description: "Enhances the notifications inbox button with context menu actions for quickly marking all servers or DMs as read, and adds a smooth bell icon animation.",
    authors: [Devs.drk],
    settings,

    start() {
        const onContextMenu = (e: MouseEvent) => {
            try {
                e.preventDefault();
                e.stopPropagation();

                const { servers, dms, serverChannels, dmChannels } = getNotificationCounts();
                const allChannels = [...serverChannels, ...dmChannels];
                const { showCounts } = settings.store;

                ContextMenuApi.openContextMenu(e as unknown as React.UIEvent, () => {
                    return (
                        <Menu.Menu navId="notif-plus-context" onClose={ContextMenuApi.closeContextMenu}>
                            <Menu.MenuItem
                                id="mark-all-read"
                                label={`Mark All Servers As Read${showCounts ? ` (${servers})` : ""}`}
                                icon={settings.store.showIcons ? DeleteIcon : undefined}
                                action={() => onClick(allChannels, "all")}
                            />
                            <Menu.MenuItem
                                id="mark-dms-read"
                                label={`Mark All DMs As Read${showCounts ? ` (${dms})` : ""}`}
                                icon={settings.store.showIcons ? NotesIcon : undefined}
                                action={() => onClick(dmChannels, "dms")}
                            />
                        </Menu.Menu>
                    );
                });
            } catch (error) {
                console.error("[NotiQuick] Error in context menu:", error);
                Toasts.show({
                    message: "Error opening context menu",
                    type: Toasts.Type.FAILURE,
                    id: "notif-plus-error"
                });
            }
        };

        const onBellClick = () => {
            const host = document.querySelector(BUTTON_SELECTOR) as HTMLElement;
            if (host) animateBellIcon(host);
        };

        this.cleanup = observeAndAttach(onContextMenu, onBellClick);
    },

    stop() {
        this.cleanup?.();
    },

    cleanup: null as (() => void) | null
});
