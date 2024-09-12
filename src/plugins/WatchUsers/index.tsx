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
    React,
    Toasts,
    UserStore
} from "@webpack/common";
import type { Channel, User } from "discord-types/general";
import type { PropsWithChildren, SVGProps } from "react";

const HeaderBarIcon = LazyComponent(() => {
    const classFilter = filters.byCode(".HEADER_BAR_BADGE");
    return find(item => item.Icon && classFilter(item.Icon)).Icon;
});

interface IconBaseProps extends IconProps {
    viewBox: string;
}

// Properties for SVG icons
interface IconProps extends SVGProps<SVGSVGElement> {
    className?: string;
    height?: string | number;
    width?: string | number;
}

// A generic Icon component for rendering SVG elements
function Icon({
    height = 24,
    width = 24,
    className,
    children,
    viewBox,
    ...svgProps
}: PropsWithChildren<IconBaseProps>) {
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

// Icon component for watching a user
function WatchIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-watch-icon")}
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M15 12C15 13.6592 13.6592 15 12 15C10.3408 15 9 13.6592 9 12C9 10.3408 10.3408 9 12 9C13.6592 9 15 10.3408 15 12Z M12 19.27C15.53 19.27 18.82 17.4413 21.11 14.2764C22.01 13.0368 22.01 10.9532 21.11 9.71356C18.82 6.54861 15.53 4.71997 12 4.71997C8.46997 4.71997 5.17997 6.54861 2.88997 9.71356C1.98997 10.9532 1.98997 13.0368 2.88997 14.2764C5.17997 17.4413 8.46997 19.27 12 19.27Z"
            />
        </Icon>
    );
}

// Icon component for unwatching a user
function UnwatchIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-unwatch-icon")}
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M1.60603 6.08062C2.11366 5.86307 2.70154 6.09822 2.9191 6.60585L1.99995 6.99977C2.9191 6.60585 2.91924 6.60618 2.9191 6.60585L2.91858 6.60465C2.9183 6.604 2.91851 6.60447 2.91858 6.60465L2.9225 6.61351C2.92651 6.62253 2.93339 6.63785 2.94319 6.65905C2.96278 6.70147 2.99397 6.76735 3.03696 6.85334C3.12302 7.02546 3.25594 7.27722 3.43737 7.58203C3.80137 8.19355 4.35439 9.00801 5.10775 9.81932C5.28532 10.0105 5.47324 10.2009 5.67173 10.3878C5.68003 10.3954 5.68823 10.4031 5.69633 10.4109C7.18102 11.8012 9.25227 12.9998 12 12.9998C13.2089 12.9998 14.2783 12.769 15.2209 12.398C16.4469 11.9154 17.4745 11.1889 18.3156 10.3995C19.2652 9.50815 19.9627 8.54981 20.4232 7.81076C20.6526 7.44268 20.8207 7.13295 20.9299 6.91886C20.9844 6.81192 21.0241 6.72919 21.0491 6.67538C21.0617 6.64848 21.0706 6.62884 21.0758 6.61704L21.0808 6.60585C21.2985 6.0985 21.8864 5.86312 22.3939 6.08062C22.9015 6.29818 23.1367 6.88606 22.9191 7.39369L22 6.99977C22.9191 7.39369 22.9192 7.39346 22.9191 7.39369L22.9169 7.39871L22.9134 7.40693L22.9019 7.43278C22.8924 7.4541 22.879 7.48354 22.8618 7.52048C22.8274 7.59434 22.7774 7.69831 22.7115 7.8275C22.5799 8.08566 22.384 8.44584 22.1206 8.86844C21.718 9.5146 21.152 10.316 20.4096 11.1241L21.2071 11.9215C21.5976 12.312 21.5976 12.9452 21.2071 13.3357C20.8165 13.7262 20.1834 13.7262 19.7928 13.3357L18.9527 12.4955C18.3884 12.9513 17.757 13.3811 17.0558 13.752L17.8381 14.9544C18.1393 15.4173 18.0083 16.0367 17.5453 16.338C17.0824 16.6392 16.463 16.5081 16.1618 16.0452L15.1763 14.5306C14.4973 14.7388 13.772 14.8863 13 14.9554V16.4998C13 17.0521 12.5522 17.4998 12 17.4998C11.4477 17.4998 11 17.0521 11 16.4998V14.9556C10.2253 14.8864 9.50014 14.7386 8.82334 14.531L7.83814 16.0452C7.53693 16.5081 6.91748 16.6392 6.45457 16.338C5.99165 16.0367 5.86056 15.4173 6.16177 14.9544L6.94417 13.7519C6.24405 13.3814 5.61245 12.9515 5.04746 12.4953L4.20706 13.3357C3.81654 13.7262 3.18337 13.7262 2.79285 13.3357C2.40232 12.9452 2.40232 12.312 2.79285 11.9215L3.59029 11.1241C2.74529 10.2043 2.12772 9.292 1.71879 8.605C1.5096 8.25356 1.35345 7.95845 1.2481 7.74776C1.19539 7.64234 1.15529 7.55783 1.12752 7.49771C1.11363 7.46765 1.10282 7.44366 1.09505 7.42618L1.08566 7.4049L1.08267 7.39801L1.0816 7.39553L1.08117 7.39453C1.08098 7.39409 1.08081 7.39369 1.99995 6.99977L1.08117 7.39453C0.863613 6.8869 1.0984 6.29818 1.60603 6.08062Z"
            />
        </Icon>
    );
}
// Voice state structure for a user in a voice channel
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

// Plugin settings configuration
export const settings = definePluginSettings({
    watchUserId: {
        type: OptionType.STRING,
        description: "User ID of the watched user",
        restartNeeded: false,
        hidden: true,
        default: "",
    },
    playSounds: {
        type: OptionType.BOOLEAN,
        description: "Play sounds when a user joins or leaves",
        restartNeeded: false,
        hidden: false,
        default: false,
    }
});

// Fetches methods for voice channel actions
const ChannelActions = findByPropsLazy("disconnect", "selectVoiceChannel");

// Fetches the voice state store
const VoiceStateStore: VoiceStateStore = findStoreLazy("VoiceStateStore");

// Bitwise constant for connection
const CONNECTION_FLAG = 1n << 20n;

// Interface for voice state store methods
interface VoiceStateStore {
    getAllVoiceStates(): VoiceStateEntries;
    getVoiceStatesForChannel(channelId: string): VoiceStateMembers;
}

// Voice state entries indexed by guild or user
interface VoiceStateEntries {
    [guildOrUser: string]: VoiceStateMembers;
}

// Voice state members indexed by user ID
interface VoiceStateMembers {
    [userId: string]: VoiceState;
}

// Retrieve the channel ID for a given user ID
function getChannelId(userId: string) {
    if (!userId) {
        return null;
    }
    try {
        const voiceStates = VoiceStateStore.getAllVoiceStates();
        for (const userStates of Object.values(voiceStates)) {
            if (userStates[userId]) {
                return userStates[userId].channelId ?? null;
            }
        }
    } catch (e) { }
    return null;
}

// Play sound when a user joins a channel
function playSoundJoin() {
    const audio = new Audio("https://github.com/KillaMeep/discordfiles/raw/main/VencordSFX/join.mp3");
    audio.play().catch(err => {
        console.error("Failed to play join sound:", err);
    });
}

// Play sound when a user leaves a channel
function playSoundLeave() {
    const audio = new Audio("https://github.com/KillaMeep/discordfiles/raw/main/VencordSFX/leave.mp3");
    audio.play().catch(err => {
        console.error("Failed to play leave sound:", err);
    });
}

// Trigger watching behavior based on user's voice channel presence
function triggerWatch(targetChannelId: string | null = getChannelId(settings.store.watchUserId)) {
    if (settings.store.watchUserId) {
        const watchedUser = UserStore.getUser(settings.store.watchUserId); // Retrieve the watched user
        if (targetChannelId) {
            const channel = ChannelStore.getChannel(targetChannelId); // Retrieve channel details
            const guildName = channel.guild_id ? findStoreLazy("GuildStore").getGuild(channel.guild_id).name : "Direct Messages"; // Get server name
            const channelName = channel.name || "Unknown Channel"; // Get channel name

            // Play sound if configured to do so
            if (settings.store.playSounds) {
                playSoundJoin();
            }

            // Display a toast notification with channel and server information
            Toasts.show({
                message: `User ${watchedUser.username} joined a channel | Channel: ${channelName} | Server: ${guildName}`,
                id: Toasts.genId(),
                type: Toasts.Type.SUCCESS,
                options: {
                    duration: 5000,
                    position: Toasts.Position.TOP
                }
            });
        } else {
            // If the user is not in a voice channel
            if (settings.store.playSounds) {
                playSoundLeave();
            }
            Toasts.show({
                message: `User ${watchedUser.username} is not in a voice channel`,
                id: Toasts.genId(),
                type: Toasts.Type.FAILURE,
                options: {
                    duration: 5000,
                    position: Toasts.Position.TOP
                }
            });
        }
    }
}

// Toggle watch status for a user
function toggleWatch(userId: string) {
    if (settings.store.watchUserId === userId) {
        settings.store.watchUserId = "";
    } else {
        settings.store.watchUserId = userId;
        triggerWatch();
    }
}

// Properties for user context in the menu
interface UserContextMenuProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

// Add context menu option for watching/unwatching users
const UserContextMenu: NavContextMenuPatchCallback = (menuItems, { user }: UserContextMenuProps) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;
    const isWatching = settings.store.watchUserId === user.id;
    const actionLabel = isWatching ? "Unwatch User" : "Watch User";
    const iconComponent = isWatching ? UnwatchIcon : WatchIcon;

    menuItems.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="watch-user"
                label={actionLabel}
                action={() => toggleWatch(user.id)}
                icon={iconComponent}
            />
        </Menu.MenuGroup>
    ));
};

// Define and export the plugin
export default definePlugin({
    name: "FindUsersInVC",
    description: "Watches a user, and notifies when they join or leave a channel in a server you share",
    authors: [Devs.KillaMeep],

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
        "user-context": UserContextMenu
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (!settings.store.watchUserId) {
                return;
            }
            for (const { userId, channelId, oldChannelId } of voiceStates) {
                if (channelId !== oldChannelId) {
                    const isFollowed = settings.store.watchUserId === userId;
                    // if the user is followed, we run
                    if (!isFollowed) {
                        continue;
                    }
                    if (channelId) {
                        // user joined a channel or moved
                        triggerWatch();
                    } else if (oldChannelId) {
                        // user left
                        triggerWatch();
                    }
                }
            }
        },
    },

    WatchIndicator() {
        const { plugins: { WatchUser: { watchUserId } } } = useSettings(["plugins.WatchUser.watchUserId"]);
        if (watchUserId) {
            return (
                <HeaderBarIcon
                    tooltip={`Watching ${UserStore.getUser(watchUserId).username} (click to trigger manually, right-click to unwatch)`}
                    icon={UnwatchIcon}
                    onClick={() => {
                        triggerWatch();
                    }}
                    onContextMenu={() => {
                        settings.store.watchUserId = "";
                    }}
                />
            );
        }

        return null;
    },

    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar)) {
            return e.toolbar.push(
                <ErrorBoundary noop={true} key="watch-indicator">
                    <this.WatchIndicator />
                </ErrorBoundary>
            );
        }

        e.toolbar = [
            <ErrorBoundary noop={true} key="watch-indicator">
                <this.WatchIndicator />
            </ErrorBoundary>,
            e.toolbar,
        ];
    },
});
