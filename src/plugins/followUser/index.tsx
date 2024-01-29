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
import { Menu, React, SelectedChannelStore, Toasts, UserStore } from "@webpack/common";
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
    onlyManualTrigger: {
        type: OptionType.BOOLEAN,
        description: "Only trigger on indicator click",
        restartNeeded: false,
        default: false
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

function triggerFollow() {
    if (settings.store.followUserId) {
        const userChannelId = getChannelId(settings.store.followUserId);
        const myChanId = SelectedChannelStore.getVoiceChannelId();
        if (userChannelId) {
            // join on follow when not already in the same channel
            if (userChannelId !== myChanId) {
                ChannelActions.selectVoiceChannel(userChannelId);
                Toasts.show({
                    message: "Followed user into a new voice channel",
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS
                });
            } else {
                Toasts.show({
                    message: "You are already in the same channel",
                    id: Toasts.genId(),
                    type: Toasts.Type.FAILURE
                });
            }
        } else if (myChanId) {
            // if not in a voice channel on follow disconnect
            if (settings.store.followLeave) {
                ChannelActions.disconnect();
                Toasts.show({
                    message: "Followed user left, disconnected",
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS
                });
            } else {
                Toasts.show({
                    message: "Followed user left, but not following disconnect",
                    id: Toasts.genId(),
                    type: Toasts.Type.FAILURE
                });
            }
        } else {
            Toasts.show({
                message: "Followed user is not in a voice channel",
                id: Toasts.genId(),
                type: Toasts.Type.FAILURE
            });
        }
    }
}

function toggleFollow(userId: string) {
    if (settings.store.followUserId === userId) {
        settings.store.followUserId = "";
    } else {
        settings.store.followUserId = userId;
        if (settings.store.executeOnFollow) {
            triggerFollow();
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
    description: "Adds a follow option in the user context menu to always be in the same VC as them",
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
            if (settings.store.onlyManualTrigger || !settings.store.followUserId) {
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
                        Toasts.show({
                            message: "Followed user into a new voice channel",
                            id: Toasts.genId(),
                            type: Toasts.Type.SUCCESS
                        });
                    } else if (oldChannelId) {
                        // leave -> disconnect
                        if (settings.store.followLeave) {
                            ChannelActions.disconnect();
                            Toasts.show({
                                message: "Followed user left, disconnected",
                                id: Toasts.genId(),
                                type: Toasts.Type.SUCCESS
                            });
                        } else {
                            Toasts.show({
                                message: "Followed user left, but not following disconnect",
                                id: Toasts.genId(),
                                type: Toasts.Type.FAILURE
                            });
                        }
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
                    tooltip={`Following ${UserStore.getUser(followUserId).username} (click to trigger manually, right-click to unfollow)`}
                    icon={UnfollowIcon}
                    onClick={() => {
                        triggerFollow();
                    }}
                    onContextMenu={() => {
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
