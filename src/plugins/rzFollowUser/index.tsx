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
    RestAPI,
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

function ReverseFollowIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-reverse-follow-icon")}
            viewBox="0 -960 960 960"
        >
            <path
                fill="currentColor"
                d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm-40-120v-160h-160v-80h160v-160h80v160h160v80H520v160h-80Z"
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
        hidden: true,
        default: "",
    },
    reverseFollowUserIds: {
        type: OptionType.STRING,
        description: "Reverse Followed User IDs (comma separated)",
        restartNeeded: false,
        hidden: true,
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

const GuildChannelStore = findStoreLazy("GuildChannelStore");
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

function getGuildIdFromChannel(channelId: string) {
    try {
        const channel = ChannelStore.getChannel(channelId);
        return channel?.guild_id ?? null;
    } catch (e) {
        return null;
    }
}


let myPreviousVoiceChannelId: string | null = null;
let lastReverseFollowUserIds: string = "";


function getReverseFollowUserIds(): string[] {
    const ids = settings.store.reverseFollowUserIds;
    return ids ? ids.split(",").filter(id => id.length > 0) : [];
}

function addReverseFollowUserId(userId: string) {
    const ids = getReverseFollowUserIds();
    if (!ids.includes(userId)) {
        ids.push(userId);
        settings.store.reverseFollowUserIds = ids.join(",");
    }
}

function removeReverseFollowUserId(userId: string) {
    const ids = getReverseFollowUserIds();
    const filtered = ids.filter(id => id !== userId);
    settings.store.reverseFollowUserIds = filtered.join(",");
}

function isReverseFollowing(userId: string): boolean {
    return getReverseFollowUserIds().includes(userId);
}

async function moveUserToChannel(userId: string, targetChannelId: string, guildId: string) {
    try {
        const channel = ChannelStore.getChannel(targetChannelId);


        const hasPermission = PermissionStore.can(PermissionsBits.MOVE_MEMBERS, channel);

        if (!hasPermission) {
            Toasts.show({
                message: "You don't have permission to move members in this server",
                id: Toasts.genId(),
                type: Toasts.Type.FAILURE
            });
            return false;
        }


        const response = await RestAPI.patch({
            url: `/guilds/${guildId}/members/${userId}`,
            body: {
                channel_id: targetChannelId
            }
        });

            if (response.ok) {
                const user = UserStore.getUser(userId);
                Toasts.show({
                    message: ` rz: Successfully pulled ${user.username} to your channel`,
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS
                });
                return true;
            } else {
            const user = UserStore.getUser(userId);
            const errorText = response.body?.message || response.text || `${response.status}`;
            Toasts.show({
                message: `❌ rz: Failed to pull ${user.username}: ${errorText}`,
                id: Toasts.genId(),
                type: Toasts.Type.FAILURE
            });
            return false;
        }
    } catch (error) {
        Toasts.show({
            message: `❌ rz: Error pulling user: ${error}`,
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE
        });
        return false;
    }
}

async function triggerReverseFollow() {
    const userIds = getReverseFollowUserIds();
    if (userIds.length > 0) {
        const myChannelId = SelectedChannelStore.getVoiceChannelId();
        if (myChannelId) {
            const myGuildId = getGuildIdFromChannel(myChannelId);

            for (const userId of userIds) {
                const userChannelId = getChannelId(userId);

                if (userChannelId) {
                    if (userChannelId === myChannelId) {
                        continue;
                    }

                    // Get guild ID from the user's current channel
                    const guildId = getGuildIdFromChannel(userChannelId);

                    if (guildId !== myGuildId) {
                        continue;
                    }

                    // Try to move the user to your channel
                    await moveUserToChannel(userId, myChannelId, guildId);
                }
            }
        } else {
            Toasts.show({
                message: "You need to be in a voice channel first",
                id: Toasts.genId(),
                type: Toasts.Type.FAILURE
            });
        }
    }
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

function toggleReverseFollow(userId: string) {
    if (isReverseFollowing(userId)) {
        removeReverseFollowUserId(userId);
    } else {
        addReverseFollowUserId(userId);
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
    const isReverseFollowed = isReverseFollowing(user.id);
    const followLabel = isFollowed ? "ابعد بعيد" : "خذني معك";
    const reverseFollowLabel = isReverseFollowed ? "✓ فكه " : "تعال";
    const followIcon = isFollowed ? UnfollowIcon : FollowIcon;
    const reverseFollowIcon = isReverseFollowed ? UnfollowIcon : ReverseFollowIcon;

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="follow-user"
                label={followLabel}
                action={() => toggleFollow(user.id)}
                icon={followIcon}
            />
            <Menu.MenuItem
                id="reverse-follow-user"
                label={reverseFollowLabel}
                action={() => toggleReverseFollow(user.id)}
                icon={reverseFollowIcon}
            />
        </Menu.MenuGroup>
    ));
};

export default definePlugin({
    name: "rz FollowUser",
    description: "Adds follow and reverse follow options in the user context menu to always be in the same VC as them or pull them to your VC. Shortcuts: Ctrl+Shift+R (clear list), Ctrl+Shift+T (trigger pull) | Enhanced by Purify",
    authors: [{ name: "rz30", id: 786315593963536415n }],

    settings,

    start() {

        document.addEventListener("keydown", this.handleKeyPress);
    },

    stop() {
        document.removeEventListener("keydown", this.handleKeyPress);
    },

    handleKeyPress(event: KeyboardEvent) {

        if (event.ctrlKey && event.shiftKey) {
            event.preventDefault();
            const userIds = getReverseFollowUserIds();
            if (userIds.length > 0) {
                settings.store.reverseFollowUserIds = "";
                Toasts.show({
                    message: `rz: Cleared ${userIds.length} user${userIds.length > 1 ? "s" : ""} from Reverse Follow list`,
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS
                });
            } else {
                Toasts.show({
                    message: "ℹ rz: Reverse Follow list is already empty",
                    id: Toasts.genId(),
                    type: Toasts.Type.INFO
                });
            }
        }


        if (event.shiftKey && event.key === "T") {
            event.preventDefault();
            const userIds = getReverseFollowUserIds();
            if (userIds.length > 0) {
                triggerReverseFollow();
                Toasts.show({
                    message: ` rz: Pulling ${userIds.length} user${userIds.length > 1 ? "s" : ""} to your channel...`,
                    id: Toasts.genId(),
                    type: Toasts.Type.INFO
                });
            } else {
                Toasts.show({
                    message: " rz: No users in Reverse Follow list",
                    id: Toasts.genId(),
                    type: Toasts.Type.FAILURE
                });
            }
        }
    },

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
            const currentUserId = UserStore.getCurrentUser().id;
            const myCurrentVoiceChannelId = SelectedChannelStore.getVoiceChannelId();

            // Check if the reverse follow users changed - reset tracking if so
            if (settings.store.reverseFollowUserIds !== lastReverseFollowUserIds) {
                lastReverseFollowUserIds = settings.store.reverseFollowUserIds;
                myPreviousVoiceChannelId = myCurrentVoiceChannelId;
            }

            // Check if I changed voice channels
            if (myCurrentVoiceChannelId !== myPreviousVoiceChannelId) {
                const reverseFollowUserIds = getReverseFollowUserIds();

                // Handle reverse follow - when I move to a new channel, pull all reverse followed users with me
                if (reverseFollowUserIds.length > 0 && myCurrentVoiceChannelId) {
                    const myGuildId = getGuildIdFromChannel(myCurrentVoiceChannelId);

                    for (const userId of reverseFollowUserIds) {
                        const reverseFollowedUserChannelId = getChannelId(userId);


                        if (reverseFollowedUserChannelId && reverseFollowedUserChannelId !== myCurrentVoiceChannelId) {
                            const userGuildId = getGuildIdFromChannel(reverseFollowedUserChannelId);


                            if (myGuildId && myGuildId === userGuildId) {
                                moveUserToChannel(userId, myCurrentVoiceChannelId, myGuildId);
                            }
                        }
                    }
                }


                myPreviousVoiceChannelId = myCurrentVoiceChannelId;
            }

            for (const { userId, channelId, oldChannelId } of voiceStates) {
                if (channelId !== oldChannelId) {
                    const isMe = userId === currentUserId;

                    const isReverseFollowed = isReverseFollowing(userId);


                    if (isReverseFollowed && channelId && !isMe) {
                        const myChannelId = SelectedChannelStore.getVoiceChannelId();
                        if (myChannelId && myChannelId !== channelId) {
                            const guildId = getGuildIdFromChannel(myChannelId);
                            const userGuildId = getGuildIdFromChannel(channelId);


                            if (guildId && guildId === userGuildId) {
                                moveUserToChannel(userId, myChannelId, guildId);
                            }
                        }
                        continue;
                    }


                    if (settings.store.onlyManualTrigger || !settings.store.followUserId) {
                        continue;
                    }


                    if (settings.store.autoMoveBack && isMe && channelId && oldChannelId) {
                        triggerFollow();
                        continue;
                    }


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

                        triggerFollow(channelId);
                    } else if (oldChannelId) {

                        triggerFollow(null);
                    }
                }
            }
        },
    },

    FollowIndicator() {
        const { plugins: { FollowUser: { followUserId, reverseFollowUserIds } } } = useSettings(["plugins.FollowUser.followUserId", "plugins.FollowUser.reverseFollowUserIds"]);

        const indicators: React.ReactNode[] = [];

        if (followUserId) {
            indicators.push(
                <HeaderBarIcon
                    key="follow-indicator"
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

        const reverseFollowIds = getReverseFollowUserIds();
        if (reverseFollowIds.length > 0) {
            const usernames = reverseFollowIds.map(id => {
                try {
                    return UserStore.getUser(id).username;
                } catch {
                    return id;
                }
            }).join(", ");

            indicators.push(
                <HeaderBarIcon
                    key="reverse-follow-indicator"
                    tooltip={`[rz's Multi-User Reverse Follow] ${reverseFollowIds.length} user${reverseFollowIds.length > 1 ? "s" : ""}: ${usernames} | Click to pull, Right-click to clear | Ctrl+Shift+T to pull, Ctrl+Shift+R to clear`}
                    icon={ReverseFollowIcon}
                    onClick={() => {
                        triggerReverseFollow();
                    }}
                    onContextMenu={() => {
                        settings.store.reverseFollowUserIds = "";
                    }}
                />
            );
        } else {

            indicators.push(
                <HeaderBarIcon
                    key="reverse-follow-indicator-empty"
                    tooltip="[rz's Multi-User Reverse Follow] No users selected. Right-click on users and select 'Reverse Follow' to add them! | Ctrl+Shift+R to clear | Ctrl+Shift+T to pull"
                    icon={ReverseFollowIcon}
                    onClick={() => {
                        Toasts.show({
                            message: "rz's Reverse Follow: No users selected. Right-click on users to add them!",
                            id: Toasts.genId(),
                            type: Toasts.Type.INFO
                        });
                    }}
                />
            );
        }

        return indicators.length > 0 ? <>{indicators}</> : null;
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
