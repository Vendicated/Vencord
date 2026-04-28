/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings, useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import {
    ChannelStore,
    Menu,
    PermissionsBits,
    PermissionStore,
    React,
    RestAPI,
    SelectedChannelStore,
    Toasts,
    UserStore
} from "@webpack/common";
import type { Channel, User } from "discord-types/general";
import type { PropsWithChildren, SVGProps } from "react";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

interface BaseIconProps extends IconProps {
    viewBox: string;
}

interface IconProps extends SVGProps<SVGSVGElement> {
    className?: string;
    height?: string | number;
    width?: string | number;
}

function Icon({
    height = 24,
    width = 24,
    className,
    children,
    viewBox,
    ...svgProps
}: PropsWithChildren<BaseIconProps>) {
    return (
        <svg
            className={classes(className, "vc-icon")}
            role="img"
            width={width}
            height={height}
            viewBox={viewBox}
            {...svgProps}
        >
            {children}
        </svg>
    );
}

// Disconnect Icon (Ban Symbol)
function DisconnectIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-autodisconnect-icon")}
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"
            />
        </Icon>
    );
}

// Mute Icon
function MuteIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-automute-icon")}
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
            />
        </Icon>
    );
}

// Deafen Icon
function DeafenIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-autodeafen-icon")}
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9zM7.5 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
            />
        </Icon>
    );
}

// Stop Icon
function StopIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-stop-icon")}
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M6 6h12v12H6z"
            />
        </Icon>
    );
}

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfStream: boolean;
    selfVideo: boolean;
    sessionId: string;
    suppress: boolean;
    requestToSpeakTimestamp: string | null;
}

export const settings = definePluginSettings({
    targetUserId: {
        type: OptionType.STRING,
        description: "Target User ID for auto actions",
        restartNeeded: false,
        hidden: true, // Managed via context menu
        default: "",
    },
    autoDisconnectEnabled: {
        type: OptionType.BOOLEAN,
        description: "Show Auto Disconnect option in context menu",
        restartNeeded: false,
        default: true
    },
    autoMuteEnabled: {
        type: OptionType.BOOLEAN,
        description: "Show Auto Mute option in context menu",
        restartNeeded: false,
        default: true
    },
    autoDeafenEnabled: {
        type: OptionType.BOOLEAN,
        description: "Show Auto Deafen option in context menu",
        restartNeeded: false,
        default: true
    },
    disconnectInterval: {
        type: OptionType.NUMBER,
        description: "Disconnect interval in seconds",
        restartNeeded: false,
        default: 2,
        markers: [0.5, 1, 2, 3, 5, 10],
        stickToMarkers: false
    },
    muteInterval: {
        type: OptionType.NUMBER,
        description: "Mute interval in seconds",
        restartNeeded: false,
        default: 1,
        markers: [0.5, 1, 2, 3, 5],
        stickToMarkers: false
    },
    deafenInterval: {
        type: OptionType.NUMBER,
        description: "Deafen interval in seconds",
        restartNeeded: false,
        default: 1,
        markers: [0.5, 1, 2, 3, 5],
        stickToMarkers: false
    },
    showToasts: {
        type: OptionType.BOOLEAN,
        description: "Show toast notifications for actions (disable for better performance)",
        restartNeeded: false,
        default: false
    },
    onlyInSameChannel: {
        type: OptionType.BOOLEAN,
        description: "Only perform actions when in the same voice channel as target",
        restartNeeded: false,
        default: false
    }
});

// Voice Actions
const VoiceActions: {
    setLocalMute: (userId: string, mute: boolean, options?: any) => void;
    setLocalVolume: (userId: string, volume: number, options?: any) => void;
} = findByPropsLazy("setLocalMute", "setLocalVolume");

const ChannelActions: {
    disconnect: () => void;
    selectVoiceChannel: (channelId: string) => void;
} = findByPropsLazy("disconnect", "selectVoiceChannel");

const VoiceStateStore: VoiceStateStore = findStoreLazy("VoiceStateStore");

interface VoiceStateStore {
    getAllVoiceStates(): VoiceStateEntry;
    getVoiceStatesForChannel(channelId: string): VoiceStateMember;
    getVoiceStateForUser(userId: string): VoiceState | null;
}

interface VoiceStateEntry {
    [guildIdOrMe: string]: VoiceStateMember;
}

interface VoiceStateMember {
    [userId: string]: VoiceState;
}

// Intervals for auto actions
let disconnectIntervalId: NodeJS.Timeout | null = null;
let muteIntervalId: NodeJS.Timeout | null = null;
let deafenIntervalId: NodeJS.Timeout | null = null;

// Rate limiting
let lastDisconnectTime = 0;
let lastMuteTime = 0;
let lastDeafenTime = 0;
const MIN_ACTION_INTERVAL = 500; // Minimum 500ms between actions

function getChannelId(userId: string) {
    if (!userId) {
        return null;
    }
    try {
        const states = VoiceStateStore.getAllVoiceStates();
        for (const users of Object.values(states)) {
            if (users[userId]) {
                return users[userId].channelId ?? null;
            }
        }
    } catch (e) { }
    return null;
}

function isInSameChannel(targetUserId: string): boolean {
    const myChannelId = SelectedChannelStore.getVoiceChannelId();
    const targetChannelId = getChannelId(targetUserId);
    return myChannelId === targetChannelId && myChannelId !== null;
}

function performDisconnect() {
    const targetUserId = settings.store.targetUserId;
    if (!targetUserId) return;

    // Rate limiting check
    const now = Date.now();
    if (now - lastDisconnectTime < MIN_ACTION_INTERVAL) {
        return;
    }
    lastDisconnectTime = now;

    if (settings.store.onlyInSameChannel && !isInSameChannel(targetUserId)) {
        return;
    }

    const targetChannelId = getChannelId(targetUserId);
    if (targetChannelId) {
        const channel = ChannelStore.getChannel(targetChannelId);
        if (channel && channel.guild_id) {
            try {
                // Gerçek disconnect API çağrısı
                RestAPI.patch({
                    url: `/guilds/${channel.guild_id}/members/${targetUserId}`,
                    body: {
                        channel_id: null,
                    }
                }).then(() => {
                    if (settings.store.showToasts) {
                        Toasts.show({
                            message: `Disconnected ${UserStore.getUser(targetUserId)?.username || 'target user'}`,
                            id: Toasts.genId(),
                            type: Toasts.Type.SUCCESS
                        });
                    }
                }).catch((e) => {
                    console.error("Failed to disconnect user:", e);
                    if (settings.store.showToasts) {
                        Toasts.show({
                            message: `Failed to disconnect: ${e.message || 'Permission denied'}`,
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE
                        });
                    }
                });
            } catch (e) {
                console.error("Failed to disconnect user:", e);
            }
        }
    }
}

function performMute() {
    const targetUserId = settings.store.targetUserId;
    if (!targetUserId) return;

    // Rate limiting check
    const now = Date.now();
    if (now - lastMuteTime < MIN_ACTION_INTERVAL) {
        return;
    }
    lastMuteTime = now;

    if (settings.store.onlyInSameChannel && !isInSameChannel(targetUserId)) {
        return;
    }

    const targetChannelId = getChannelId(targetUserId);
    if (targetChannelId) {
        const channel = ChannelStore.getChannel(targetChannelId);
        if (channel && channel.guild_id) {
            try {
                // Gerçek server-side mute API çağrısı
                RestAPI.patch({
                    url: `/guilds/${channel.guild_id}/members/${targetUserId}`,
                    body: {
                        mute: true,
                    }
                }).then(() => {
                    if (settings.store.showToasts) {
                        Toasts.show({
                            message: `Muted ${UserStore.getUser(targetUserId)?.username || 'target user'}`,
                            id: Toasts.genId(),
                            type: Toasts.Type.SUCCESS
                        });
                    }
                }).catch((e) => {
                    console.error("Failed to mute user:", e);
                    if (settings.store.showToasts) {
                        Toasts.show({
                            message: `Failed to mute: ${e.message || 'Permission denied'}`,
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE
                        });
                    }
                });
            } catch (e) {
                console.error("Failed to mute user:", e);
            }
        }
    } else {
        // Fallback: Lokal mute
        try {
            VoiceActions.setLocalMute(targetUserId, true);
            if (settings.store.showToasts) {
                Toasts.show({
                    message: `Locally muted ${UserStore.getUser(targetUserId)?.username || 'target user'}`,
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS
                });
            }
        } catch (e) {
            console.error("Failed to locally mute user:", e);
        }
    }
}

function performDeafen() {
    const targetUserId = settings.store.targetUserId;
    if (!targetUserId) return;

    // Rate limiting check
    const now = Date.now();
    if (now - lastDeafenTime < MIN_ACTION_INTERVAL) {
        return;
    }
    lastDeafenTime = now;

    if (settings.store.onlyInSameChannel && !isInSameChannel(targetUserId)) {
        return;
    }

    const targetChannelId = getChannelId(targetUserId);
    if (targetChannelId) {
        const channel = ChannelStore.getChannel(targetChannelId);
        if (channel && channel.guild_id) {
            try {
                // Gerçek server-side deafen API çağrısı
                RestAPI.patch({
                    url: `/guilds/${channel.guild_id}/members/${targetUserId}`,
                    body: {
                        deaf: true,
                    }
                }).then(() => {
                    if (settings.store.showToasts) {
                        Toasts.show({
                            message: `Deafened ${UserStore.getUser(targetUserId)?.username || 'target user'}`,
                            id: Toasts.genId(),
                            type: Toasts.Type.SUCCESS
                        });
                    }
                }).catch((e) => {
                    console.error("Failed to deafen user:", e);
                    if (settings.store.showToasts) {
                        Toasts.show({
                            message: `Failed to deafen: ${e.message || 'Permission denied'}`,
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE
                        });
                    }
                });
            } catch (e) {
                console.error("Failed to deafen user:", e);
            }
        }
    }
}

function startAutoDisconnect() {
    if (disconnectIntervalId) {
        clearInterval(disconnectIntervalId);
    }
    
    // İlk işlemi hemen yap
    performDisconnect();
    
    disconnectIntervalId = setInterval(() => {
        performDisconnect();
    }, Math.max(settings.store.disconnectInterval * 1000, MIN_ACTION_INTERVAL));
    
    if (settings.store.showToasts) {
        Toasts.show({
            message: "Auto disconnect started",
            id: Toasts.genId(),
            type: Toasts.Type.SUCCESS
        });
    }
}

function stopAutoDisconnect() {
    if (disconnectIntervalId) {
        clearInterval(disconnectIntervalId);
        disconnectIntervalId = null;
    }
    
    if (settings.store.showToasts) {
        Toasts.show({
            message: "Auto disconnect stopped",
            id: Toasts.genId(),
            type: Toasts.Type.MESSAGE
        });
    }
}

function startAutoMute() {
    if (muteIntervalId) {
        clearInterval(muteIntervalId);
    }
    
    // İlk işlemi hemen yap
    performMute();
    
    muteIntervalId = setInterval(() => {
        performMute();
    }, Math.max(settings.store.muteInterval * 1000, MIN_ACTION_INTERVAL));
    
    if (settings.store.showToasts) {
        Toasts.show({
            message: "Auto mute started",
            id: Toasts.genId(),
            type: Toasts.Type.SUCCESS
        });
    }
}

function stopAutoMute() {
    if (muteIntervalId) {
        clearInterval(muteIntervalId);
        muteIntervalId = null;
    }
    
    if (settings.store.showToasts) {
        Toasts.show({
            message: "Auto mute stopped",
            id: Toasts.genId(),
            type: Toasts.Type.MESSAGE
        });
    }
}

function startAutoDeafen() {
    if (deafenIntervalId) {
        clearInterval(deafenIntervalId);
    }
    
    // İlk işlemi hemen yap
    performDeafen();
    
    deafenIntervalId = setInterval(() => {
        performDeafen();
    }, Math.max(settings.store.deafenInterval * 1000, MIN_ACTION_INTERVAL));
    
    if (settings.store.showToasts) {
        Toasts.show({
            message: "Auto deafen started",
            id: Toasts.genId(),
            type: Toasts.Type.SUCCESS
        });
    }
}

function stopAutoDeafen() {
    if (deafenIntervalId) {
        clearInterval(deafenIntervalId);
        deafenIntervalId = null;
    }
    
    if (settings.store.showToasts) {
        Toasts.show({
            message: "Auto deafen stopped",
            id: Toasts.genId(),
            type: Toasts.Type.MESSAGE
        });
    }
}

// Yeni state için ayrı ayarlar
let isAutoDisconnectActive = false;
let isAutoMuteActive = false;
let isAutoDeafenActive = false;

function toggleAutoDisconnect(userId: string) {
    if (settings.store.targetUserId === userId && isAutoDisconnectActive) {
        isAutoDisconnectActive = false;
        settings.store.targetUserId = "";
        stopAutoDisconnect();
    } else {
        // Sessizce diğer aksiyonları durdur
        if (muteIntervalId) {
            clearInterval(muteIntervalId);
            muteIntervalId = null;
        }
        if (deafenIntervalId) {
            clearInterval(deafenIntervalId);
            deafenIntervalId = null;
        }
        
        settings.store.targetUserId = userId;
        isAutoDisconnectActive = true;
        isAutoMuteActive = false;
        isAutoDeafenActive = false;
        startAutoDisconnect();
    }
}

function toggleAutoMute(userId: string) {
    if (settings.store.targetUserId === userId && isAutoMuteActive) {
        isAutoMuteActive = false;
        settings.store.targetUserId = "";
        stopAutoMute();
    } else {
        // Sessizce diğer aksiyonları durdur
        if (disconnectIntervalId) {
            clearInterval(disconnectIntervalId);
            disconnectIntervalId = null;
        }
        if (deafenIntervalId) {
            clearInterval(deafenIntervalId);
            deafenIntervalId = null;
        }
        
        settings.store.targetUserId = userId;
        isAutoMuteActive = true;
        isAutoDisconnectActive = false;
        isAutoDeafenActive = false;
        startAutoMute();
    }
}

function toggleAutoDeafen(userId: string) {
    if (settings.store.targetUserId === userId && isAutoDeafenActive) {
        isAutoDeafenActive = false;
        settings.store.targetUserId = "";
        stopAutoDeafen();
    } else {
        // Sessizce diğer aksiyonları durdur
        if (disconnectIntervalId) {
            clearInterval(disconnectIntervalId);
            disconnectIntervalId = null;
        }
        if (muteIntervalId) {
            clearInterval(muteIntervalId);
            muteIntervalId = null;
        }
        
        settings.store.targetUserId = userId;
        isAutoDeafenActive = true;
        isAutoDisconnectActive = false;
        isAutoMuteActive = false;
        startAutoDeafen();
    }
}

function stopAllActions() {
    isAutoDisconnectActive = false;
    isAutoMuteActive = false;
    isAutoDeafenActive = false;
    settings.store.targetUserId = "";
    stopAutoDisconnect();
    stopAutoMute();
    stopAutoDeafen();
}

interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

const UserContext: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;
    
    const isTargeted = settings.store.targetUserId === user.id;
    const isAutoDisconnecting = isTargeted && isAutoDisconnectActive;
    const isAutoMuting = isTargeted && isAutoMuteActive;
    const isAutoDeafening = isTargeted && isAutoDeafenActive;

    const menuItems = [];

    // Sadece enabled olanları göster
    if (settings.store.autoDisconnectEnabled) {
        menuItems.push(
            <Menu.MenuItem
                id="auto-disconnect-user"
                label={isAutoDisconnecting ? "Stop Auto Disconnect" : "Auto Disconnect"}
                action={() => toggleAutoDisconnect(user.id)}
                icon={DisconnectIcon}
                color={isAutoDisconnecting ? "danger" : undefined}
            />
        );
    }

    if (settings.store.autoMuteEnabled) {
        menuItems.push(
            <Menu.MenuItem
                id="auto-mute-user"
                label={isAutoMuting ? "Stop Auto Mute" : "Auto Mute"}
                action={() => toggleAutoMute(user.id)}
                icon={MuteIcon}
                color={isAutoMuting ? "danger" : undefined}
            />
        );
    }

    if (settings.store.autoDeafenEnabled) {
        menuItems.push(
            <Menu.MenuItem
                id="auto-deafen-user"
                label={isAutoDeafening ? "Stop Auto Deafen" : "Auto Deafen"}
                action={() => toggleAutoDeafen(user.id)}
                icon={DeafenIcon}
                color={isAutoDeafening ? "danger" : undefined}
            />
        );
    }

    if (isTargeted) {
        menuItems.push(
            <Menu.MenuItem
                id="stop-all-auto-actions"
                label="Stop All Auto Actions"
                action={() => stopAllActions()}
                icon={StopIcon}
                color="danger"
            />
        );
    }

    // Sadece menu item'lar varsa grup oluştur
    if (menuItems.length > 0) {
        children.splice(-1, 0, (
            <Menu.MenuGroup>
                {menuItems}
            </Menu.MenuGroup>
        ));
    }
};

export default definePlugin({
    name: "AutoDisconnectAndAutoMute",
    description: "Automatically disconnect or mute selected users from voice channels",
    authors: [Devs.rz30],
    settings,

    patches: [
        {
            find: "toolbar:function",
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,100}mobileToolbar)/,
                replace: "$1$self.addIconToToolBar(arguments[0]);$2"
            }
        },
    ],

    contextMenus: {
        "user-context": UserContext
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const targetUserId = settings.store.targetUserId;
            if (!targetUserId) return;

            for (const { userId, channelId } of voiceStates) {
                if (userId === targetUserId && channelId) {
                    // Target user joined a voice channel, perform instant action
                    if (isAutoDisconnectActive) {
                        setTimeout(performDisconnect, 100); // Small delay to avoid race conditions
                    }
                    if (isAutoMuteActive) {
                        setTimeout(performMute, 100);
                    }
                    if (isAutoDeafenActive) {
                        setTimeout(performDeafen, 100);
                    }
                }
            }
        },
    },

    AutoActionIndicator() {
        const { plugins: { AutoDisconnectAndAutoMute: { targetUserId } } } = useSettings([
            "plugins.AutoDisconnectAndAutoMute.targetUserId"
        ]);
        
        if (targetUserId && (isAutoDisconnectActive || isAutoMuteActive || isAutoDeafenActive)) {
            const targetUser = UserStore.getUser(targetUserId);
            const actionType = isAutoDisconnectActive ? "disconnecting" : isAutoMuteActive ? "muting" : "deafening";
            const icon = isAutoDisconnectActive ? DisconnectIcon : isAutoMuteActive ? MuteIcon : DeafenIcon;
            
            return (
                <HeaderBarIcon
                    tooltip={`Auto ${actionType} ${targetUser?.username || 'unknown user'} (click to stop)`}
                    icon={icon}
                    onClick={() => {
                        stopAllActions();
                    }}
                />
            );
        }

        return null;
    },

    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar)) {
            return e.toolbar.unshift(
                <ErrorBoundary noop={true} key="auto-action-indicator">
                    <this.AutoActionIndicator/>
                </ErrorBoundary>
            );
        }

        e.toolbar = [
            <ErrorBoundary noop={true} key="auto-action-indicator">
                <this.AutoActionIndicator />
            </ErrorBoundary>,
            e.toolbar,
        ];
    },

    start() {
        // Plugin start'ta hiçbir şey yapmıyoruz - manuel olarak başlatılacak
    },

    stop() {
        stopAllActions();
    }
});