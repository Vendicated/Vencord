/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { showNotification } from "@api/Notifications";
import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Menu, PresenceStore, React, SelectedChannelStore, Tooltip, UserStore } from "@webpack/common";
import type { Channel, User } from "discord-types/general";
import { CSSProperties } from "react";

import { NotificationsOffIcon } from "./components/NotificationsOffIcon";
import { NotificationsOnIcon } from "./components/NotificationsOnIcon";

interface PresenceUpdate {
    user: {
        id: string;
        username?: string;
        global_name?: string;
    };
    clientStatus: {
        desktop?: string;
        web?: string;
        mobile?: string;
        console?: string;
    };
    guildId?: string;
    status: string;
    broadcast?: any; // what's this?
    activities: Array<{
        session_id: string;
        created_at: number;
        id: string;
        name: string;
        details?: string;
        type: number;
    }>;
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

function shouldBeNative() {
    if (typeof Notification === "undefined") return false;

    const { useNative } = Settings.notifications;
    if (useNative === "always") return true;
    if (useNative === "not-focused") return !document.hasFocus();
    return false;
}

const SessionsStore = findStoreLazy("SessionsStore");

const StatusUtils = findByPropsLazy("useStatusFillColor", "StatusTypes");

function Icon(path: string, opts?: { viewBox?: string; width?: number; height?: number; }) {
    return ({ color, tooltip, small }: { color: string; tooltip: string; small: boolean; }) => (
        <Tooltip text={tooltip} >
            {(tooltipProps: any) => (
                <svg
                    {...tooltipProps}
                    height={(opts?.height ?? 20) - (small ? 3 : 0)}
                    width={(opts?.width ?? 20) - (small ? 3 : 0)}
                    viewBox={opts?.viewBox ?? "0 0 24 24"}
                    fill={color}
                >
                    <path d={path} />
                </svg>
            )}
        </Tooltip>
    );
}

const Icons = {
    desktop: Icon("M4 2.5c-1.103 0-2 .897-2 2v11c0 1.104.897 2 2 2h7v2H7v2h10v-2h-4v-2h7c1.103 0 2-.896 2-2v-11c0-1.103-.897-2-2-2H4Zm16 2v9H4v-9h16Z"),
    web: Icon("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93Zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39Z"),
    mobile: Icon("M 187 0 L 813 0 C 916.277 0 1000 83.723 1000 187 L 1000 1313 C 1000 1416.277 916.277 1500 813 1500 L 187 1500 C 83.723 1500 0 1416.277 0 1313 L 0 187 C 0 83.723 83.723 0 187 0 Z M 125 1000 L 875 1000 L 875 250 L 125 250 Z M 500 1125 C 430.964 1125 375 1180.964 375 1250 C 375 1319.036 430.964 1375 500 1375 C 569.036 1375 625 1319.036 625 1250 C 625 1180.964 569.036 1125 500 1125 Z", { viewBox: "0 0 1000 1500", height: 17, width: 17 }),
    console: Icon("M14.8 2.7 9 3.1V47h3.3c1.7 0 6.2.3 10 .7l6.7.6V2l-4.2.2c-2.4.1-6.9.3-10 .5zm1.8 6.4c1 1.7-1.3 3.6-2.7 2.2C12.7 10.1 13.5 8 15 8c.5 0 1.2.5 1.6 1.1zM16 33c0 6-.4 10-1 10s-1-4-1-10 .4-10 1-10 1 4 1 10zm15-8v23.3l3.8-.7c2-.3 4.7-.6 6-.6H43V3h-2.2c-1.3 0-4-.3-6-.6L31 1.7V25z", { viewBox: "0 0 50 50" }),
};
type Platform = keyof typeof Icons;

const PlatformIcon = ({ platform, status, small }: { platform: Platform, status: string; small: boolean; }) => {
    const tooltip = platform[0].toUpperCase() + platform.slice(1);
    const Icon = Icons[platform] ?? Icons.desktop;

    return <Icon color={StatusUtils.useStatusFillColor(status)} tooltip={tooltip} small={small} />;
};

interface PlatformIndicatorProps {
    user: User;
    wantMargin?: boolean;
    wantTopMargin?: boolean;
    small?: boolean;
    style?: CSSProperties;
}

const PlatformIndicator = ({ user, wantMargin = true, wantTopMargin = false, small = false, style = {} }: PlatformIndicatorProps) => {
    if (!user || user.bot) return null;

    if (user.id === UserStore.getCurrentUser().id) {
        const sessions = SessionsStore.getSessions();
        if (typeof sessions !== "object") return null;
        const sortedSessions = Object.values(sessions).sort(({ status: a }: any, { status: b }: any) => {
            if (a === b) return 0;
            if (a === "online") return 1;
            if (b === "online") return -1;
            if (a === "idle") return 1;
            if (b === "idle") return -1;
            return 0;
        });

        const ownStatus = Object.values(sortedSessions).reduce((acc: any, curr: any) => {
            if (curr.clientInfo.client !== "unknown")
                acc[curr.clientInfo.client] = curr.status;
            return acc;
        }, {});

        const { clientStatuses } = PresenceStore.getState();
        clientStatuses[UserStore.getCurrentUser().id] = ownStatus;
    }

    const status = PresenceStore.getState()?.clientStatuses?.[user.id] as Record<Platform, string>;
    if (!status) return null;

    const icons = Object.entries(status).map(([platform, status]) => (
        <PlatformIcon
            key={platform}
            platform={platform as Platform}
            status={status}
            small={small}
        />
    ));

    if (!icons.length) return null;

    return (
        <span
            className="vc-platform-indicator"
            style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: wantMargin ? 4 : 0,
                verticalAlign: "top",
                position: "relative",
                top: wantTopMargin ? 2 : 0,
                padding: !wantMargin ? 1 : 0,
                gap: 2,
                ...style
            }}

        >
            {icons}
        </span>
    );
};

export const settings = definePluginSettings({
    notifyStatus: {
        type: OptionType.BOOLEAN,
        description: "Notify on status changes",
        restartNeeded: false,
        default: true,
    },
    notifyVoice: {
        type: OptionType.BOOLEAN,
        description: "Notify on voice channel changes",
        restartNeeded: false,
        default: false,
    },
    persistNotifications: {
        type: OptionType.BOOLEAN,
        description: "Persist notifications",
        restartNeeded: false,
        default: false,
    },
    userIds: {
        type: OptionType.STRING,
        description: "User IDs (comma separated)",
        restartNeeded: false,
        default: "",
    }
});

function getUserIdList() {
    try {
        return settings.store.userIds.split(",").filter(Boolean);
    } catch (e) {
        settings.store.userIds = "";
        return [];
    }
}

// show rich body with user avatar
const getRichBody = (user: User, text: string | React.ReactNode) => <div
    style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
    <div style={{ position: "relative" }}>
        <img src={user.getAvatarURL(void 0, 80, true)}
            style={{ width: "80px", height: "80px", borderRadius: "15%" }} alt={`${user.username}'s avatar`} />
        <PlatformIndicator user={user} style={{ position: "absolute", top: "-8px", right: "-10px" }} />
    </div>
    <span>{text}</span>
</div>;

function triggerVoiceNotification(userId: string, userChannelId: string | null) {
    const user = UserStore.getUser(userId);
    const myChanId = SelectedChannelStore.getVoiceChannelId();

    const name = user.username;

    const title = shouldBeNative() ? `User ${name} changed voice status` : "User voice status change";
    if (userChannelId) {
        if (userChannelId !== myChanId) {
            showNotification({
                title,
                body: "joined a new voice channel",
                noPersist: !settings.store.persistNotifications,
                richBody: getRichBody(user, `${name} joined a new voice channel`),
            });
        }
    } else {
        showNotification({
            title,
            body: "left their voice channel",
            noPersist: !settings.store.persistNotifications,
            richBody: getRichBody(user, `${name} left their voice channel`),
        });
    }
}

function toggleUserNotify(userId: string) {
    const userIds = getUserIdList();
    if (userIds.includes(userId)) {
        userIds.splice(userIds.indexOf(userId), 1);
    } else {
        userIds.push(userId);
    }
    settings.store.userIds = userIds.join(",");
}

interface UserContextProps {
    channel?: Channel;
    guildId?: string;
    user: User;
}

const UserContext: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;
    const isNotifyOn = getUserIdList().includes(user.id);
    const label = isNotifyOn ? "Don't notify on changes" : "Notify on changes";
    const icon = isNotifyOn ? NotificationsOffIcon : NotificationsOnIcon;

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="toggle-notify-user"
                label={label}
                action={() => toggleUserNotify(user.id)}
                icon={icon}
            />
        </Menu.MenuGroup>
    ));
};

const lastStatuses = new Map<string, string>();

export default definePlugin({
    name: "NotifyUserChanges",
    description: "Adds a notify option in the user context menu to get notified when a user changes voice channels or online status",
    authors: [Devs.D3SOX],

    settings,

    contextMenus: {
        "user-context": UserContext
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (!settings.store.notifyVoice || !settings.store.userIds) {
                return;
            }
            for (const { userId, channelId, oldChannelId } of voiceStates) {
                if (channelId !== oldChannelId) {
                    const isFollowed = getUserIdList().includes(userId);
                    if (!isFollowed) {
                        continue;
                    }

                    if (channelId) {
                        // move or join new channel
                        triggerVoiceNotification(userId, channelId);
                    } else if (oldChannelId) {
                        // leave
                        triggerVoiceNotification(userId, null);
                    }
                }
            }
        },
        PRESENCE_UPDATES({ updates }: { updates: PresenceUpdate[]; }) {
            if (!settings.store.notifyStatus || !settings.store.userIds) {
                return;
            }
            for (const { user: { id: userId, username }, status } of updates) {
                const isFollowed = getUserIdList().includes(userId);
                if (!isFollowed) {
                    continue;
                }

                // this is also triggered for multiple guilds and when only the activities change, so we have to check if the status actually changed
                if (lastStatuses.has(userId) && lastStatuses.get(userId) !== status) {
                    const user = UserStore.getUser(userId);
                    const name = username ?? user.username;

                    showNotification({
                        title: shouldBeNative() ? `User ${name} changed status` : "User status change",
                        body: `is now ${status}`,
                        noPersist: !settings.store.persistNotifications,
                        richBody: getRichBody(user, `${name}'s status is now ${status}`),
                    });
                }
                lastStatuses.set(userId, status);
            }
        }
    },

});
