/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { FollowIcon, UnfollowIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Menu, UserStore } from "@webpack/common";
import { VoiceState } from "@webpack/types";
import type { Channel, User } from "discord-types/general";

export const settings = definePluginSettings({
    followLeave: {
        type: OptionType.BOOLEAN,
        description: "Also leave when the followed user leaves",
        restartNeeded: false,
        default: false
    },
});

const ChannelActions: {
    disconnect: () => void;
    selectVoiceChannel: (channelId: string) => void;
} = findByPropsLazy("disconnect", "selectVoiceChannel");

function toggleFollow(userId: string) {
    if (followedUserId === userId) {
        followedUserId = null;
    } else {
        followedUserId = userId;
    }
}

interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

const UserContext: NavContextMenuPatchCallback = (children, { user, guildId }: UserContextProps) => () => {
    if (!user || !guildId || user.id === UserStore.getCurrentUser().id) return;
    const isFollowed = followedUserId === user.id;
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

// Save the followed user id
let followedUserId: string | null = null;

export default definePlugin({
    name: "FollowUser",
    description: "Adds a follow user option in the guild user context menu to always be in the same VC as them",
    authors: [Devs.D3SOX],

    settings,

    start() {
        addContextMenuPatch("user-context", UserContext);
    },

    stop() {
        removeContextMenuPatch("user-context", UserContext);
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (!followedUserId) {
                return;
            }
            for (const state of voiceStates) {
                const { userId, channelId, oldChannelId } = state;
                const isFollowed = followedUserId === userId;

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

});
