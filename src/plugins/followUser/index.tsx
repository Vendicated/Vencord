/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings, useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { FollowIcon, UnfollowIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/lazyReact";
import definePlugin, { OptionType } from "@utils/types";
import { filters, find, findByPropsLazy, findStoreLazy } from "@webpack";
import { Menu, React, SelectedChannelStore, UserStore } from "@webpack/common";
import { VoiceState } from "@webpack/types";
import type { Channel, User } from "discord-types/general";

const HeaderBarIcon = LazyComponent(() => {
    const filter = filters.byCode(".HEADER_BAR_BADGE");
    return find(m => m.Icon && filter(m.Icon)).Icon;
});

export const settings = definePluginSettings({
    executeOnFollow: {
        type: OptionType.BOOLEAN,
        description: "Make sure to be in the same VC when following a user",
        restartNeeded: false,
        default: true
    },
    followLeave: {
        type: OptionType.BOOLEAN,
        description: "Also leave when the followed user leaves",
        restartNeeded: false,
        default: false
    },
    followUserId: {
        type: OptionType.STRING,
        description: "Followed User ID",
        restartNeeded: false,
        hidden: true, // Managed via context menu and indicator
        default: "",
    }
});

const ChannelActions: {
    disconnect: () => void;
    selectVoiceChannel: (channelId: string) => void;
} = findByPropsLazy("disconnect", "selectVoiceChannel");

const VoiceStateStore: VoiceStateStore = findStoreLazy("VoiceStateStore");

interface VoiceStateStore {
    getAllVoiceStates(): VoiceStateEntry;
}

interface VoiceStateEntry {
    [guildIdOrMe: string]: {
        [userId: string]: VoiceState;
    }
}

function getChannelId(userId: string) {
    try {
        const states = VoiceStateStore.getAllVoiceStates();
        for (const users of Object.values(states)) {
            if (users[userId]) {
                return users[userId].channelId;
            }
        }
    } catch(e) {}
}

function toggleFollow(userId: string) {
    if (settings.store.followUserId === userId) {
        settings.store.followUserId = "";
    } else {
        settings.store.followUserId = userId;

        if (settings.store.executeOnFollow) {
            const userChannelId = getChannelId(userId);
            const myChanId = SelectedChannelStore.getVoiceChannelId();
            if (userChannelId && userChannelId !== myChanId) {
                // join on follow when not already in the same channel
                ChannelActions.selectVoiceChannel(userChannelId);
            } else if (!userChannelId && myChanId && settings.store.followLeave) {
                // if not in a voice channel on follow disconnect
                ChannelActions.disconnect();
            }
        }
    }
}

interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

const UserContext: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => () => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;
    const isFollowed = settings.store.followUserId === user.id;
    const label = isFollowed ? "Unfollow User" : "Follow User";
    const icon = isFollowed ? UnfollowIcon : FollowIcon;

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="follow-user"
                label={label}
                action={() => toggleFollow(user.id)}
                icon={icon}
            />
        </Menu.MenuGroup>
    ));
};

export default definePlugin({
    name: "FollowUser",
    description: "Adds a follow user option in the user context menu to always be in the same VC as them",
    authors: [Devs.D3SOX],

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

    start() {
        addContextMenuPatch("user-context", UserContext);
    },

    stop() {
        removeContextMenuPatch("user-context", UserContext);
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (!settings.store.followUserId) {
                return;
            }
            for (const state of voiceStates) {
                const { userId, channelId, oldChannelId } = state;
                const isFollowed = settings.store.followUserId === userId;

                if (!isFollowed) {
                    continue;
                }

                if (channelId !== oldChannelId) {
                    if (channelId) {
                        // move or join new channel -> also join
                        ChannelActions.selectVoiceChannel(channelId);
                    } else if (oldChannelId && settings.store.followLeave) {
                        // leave -> disconnect
                        ChannelActions.disconnect();
                    }
                }
            }
        },
    },

    FollowIndicator() {
        const { plugins: { FollowUser: { followUserId } } } = useSettings(["plugins.FollowUser.followUserId"]);
        if (followUserId) {
            return (
                <HeaderBarIcon
                    className="vc-follow-user-indicator"
                    tooltip={`Following ${UserStore.getUser(followUserId).username} (click to unfollow)`}
                    icon={UnfollowIcon}
                    onClick={() => {
                        settings.store.followUserId = "";
                    }}
                />
            );
        }

        return null;
    },

    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar)) {
            return e.toolbar.push(
                <ErrorBoundary noop={true} key="follow-indicator">
                    <this.FollowIndicator/>
                </ErrorBoundary>
            );
        }

        e.toolbar = [
            <ErrorBoundary noop={true} key="follow-indicator">
                <this.FollowIndicator />
            </ErrorBoundary>,
            e.toolbar,
        ];
    },

});
