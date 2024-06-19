/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { shouldBeNative, showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React, SelectedChannelStore, UserStore } from "@webpack/common";
import { PresenceUpdate, VoiceState } from "@webpack/types";
import type { Channel, User } from "discord-types/general";

import { PlatformIndicator } from "../platformIndicators";
import { NotificationsOffIcon } from "./components/NotificationsOffIcon";
import { NotificationsOnIcon } from "./components/NotificationsOnIcon";

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
            style={{ width: "80px", height: "80px", borderRadius: "15%" }} alt={`${user.username}'s avatar`}/>
        <PlatformIndicator user={user} style={{ position: "absolute", top: "-8px", right: "-10px" }}/>
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
        PRESENCE_UPDATES({ updates }: { updates: PresenceUpdate[] }) {
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
