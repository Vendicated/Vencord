/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings, useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/lazyReact";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { filters, find, findByPropsLazy, findStoreLazy } from "@webpack";
import {
    ChannelStore,
    Menu,
    PermissionsBits,
    PermissionStore,
    React,
    SelectedChannelStore,
    Toasts,
    UserStore
} from "@webpack/common";
import type { Channel, User } from "discord-types/general";
import type { PropsWithChildren, SVGProps } from "react";

const HeaderBarIcon = LazyComponent(() => {
    const filter = filters.byCode(".HEADER_BAR_BADGE");
    return find(m => m.Icon && filter(m.Icon)).Icon;
});

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

function FollowIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-follow-icon")}
            viewBox="0 -960 960 960"
        >
            <path
                fill="currentColor"
                d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"
            />
        </Icon>
    );
}

function UnfollowIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-unfollow-icon")}
            viewBox="0 -960 960 960"
        >
            <path
                fill="currentColor"
                d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z"
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
    autoMoveBack: {
        type: OptionType.BOOLEAN,
        description: "Automatically move back to the VC of the followed user when you got moved",
        restartNeeded: false,
        default: false
    },
    followUserId: {
        type: OptionType.STRING,
        description: "Followed User ID",
        restartNeeded: false,
        hidden: true, // Managed via context menu and indicator
        default: "",
    },
    channelFull: {
        type: OptionType.BOOLEAN,
        description: "Attempt to move you to the channel when is not full anymore",
        restartNeeded: false,
        default: true,
    }
});

const ChannelActions: {
    disconnect: () => void;
    selectVoiceChannel: (channelId: string) => void;
} = findByPropsLazy("disconnect", "selectVoiceChannel");

const VoiceStateStore: VoiceStateStore = findStoreLazy("VoiceStateStore");
const CONNECT = 1n << 20n;

interface VoiceStateStore {
    getAllVoiceStates(): VoiceStateEntry;
    getVoiceStatesForChannel(channelId: string): VoiceStateMember;
}

interface VoiceStateEntry {
    [guildIdOrMe: string]: VoiceStateMember;
}

interface VoiceStateMember {
    [userId: string]: VoiceState;
}

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

function triggerFollow(userChannelId: string | null = getChannelId(settings.store.followUserId)) {
    if (settings.store.followUserId) {
        const myChanId = SelectedChannelStore.getVoiceChannelId();
        if (userChannelId) {
            // join when not already in the same channel
            if (userChannelId !== myChanId) {
                const channel = ChannelStore.getChannel(userChannelId);
                const voiceStates = VoiceStateStore.getVoiceStatesForChannel(userChannelId);
                const memberCount = voiceStates ? Object.keys(voiceStates).length : null;
                if (channel.type === 1 || PermissionStore.can(CONNECT, channel)) {
                    if (channel.userLimit !== 0 && memberCount !== null && memberCount >= channel.userLimit && !PermissionStore.can(PermissionsBits.MOVE_MEMBERS, channel)) {
                        Toasts.show({
                            message: "Channel is full",
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE
                        });
                        return;
                    }
                    ChannelActions.selectVoiceChannel(userChannelId);
                    Toasts.show({
                        message: "Followed user into a new voice channel",
                        id: Toasts.genId(),
                        type: Toasts.Type.SUCCESS
                    });
                } else {
                    Toasts.show({
                        message: "Insufficient permissions to enter in the voice channel",
                        id: Toasts.genId(),
                        type: Toasts.Type.FAILURE
                    });
                }
            } else {
                Toasts.show({
                    message: "You are already in the same channel",
                    id: Toasts.genId(),
                    type: Toasts.Type.FAILURE
                });
            }
        } else if (myChanId) {
            // if not in a voice channel and the setting is on disconnect
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

const UserContext: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
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

    contextMenus: {
        "user-context": UserContext
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (settings.store.onlyManualTrigger || !settings.store.followUserId) {
                return;
            }
            for (const { userId, channelId, oldChannelId } of voiceStates) {
                if (channelId !== oldChannelId) {
                    const isMe = userId === UserStore.getCurrentUser().id;
                    // move back if the setting is on and you were moved
                    if (settings.store.autoMoveBack && isMe && channelId && oldChannelId) {
                        triggerFollow();
                        continue;
                    }

                    // if you're not in the channel of the followed user and it is no longer full, join
                    if (settings.store.channelFull && !isMe && !channelId && oldChannelId && oldChannelId !== SelectedChannelStore.getVoiceChannelId()) {
                        const channel = ChannelStore.getChannel(oldChannelId);
                        const channelVoiceStates = VoiceStateStore.getVoiceStatesForChannel(oldChannelId);
                        const memberCount = channelVoiceStates ? Object.keys(channelVoiceStates).length : null;
                        if (channel.userLimit !== 0 && memberCount !== null && memberCount === (channel.userLimit - 1) && !PermissionStore.can(PermissionsBits.MOVE_MEMBERS, channel)) {
                            const users = Object.values(channelVoiceStates).map(x => x.userId);
                            if (users.includes(settings.store.followUserId)) {
                                triggerFollow(oldChannelId);
                                continue;
                            }
                        }
                    }

                    const isFollowed = settings.store.followUserId === userId;
                    if (!isFollowed) {
                        continue;
                    }

                    if (channelId) {
                        // move or join new channel -> also join
                        triggerFollow(channelId);
                    } else if (oldChannelId) {
                        // leave -> disconnect
                        triggerFollow(null);
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
