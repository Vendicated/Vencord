/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@equicordplugins/_misc/styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Forms, Menu, React } from "@webpack/common";
import { VoiceState } from "@webpack/types";
import { Channel, User } from "discord-types/general";

type TFollowedUserInfo = {
    lastChannelId: string;
    userId: string;
} | null;

interface UserContextProps {
    channel: Channel;
    user: User;
    guildId?: string;
}

let followedUserInfo: TFollowedUserInfo = null;

const voiceChannelAction = findByPropsLazy("selectVoiceChannel");
const VoiceStateStore = findStoreLazy("VoiceStateStore");
const UserStore = findStoreLazy("UserStore");
const RelationshipStore = findStoreLazy("RelationshipStore");

const settings = definePluginSettings({
    onlyWhenInVoice: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Only follow the user when you are in a voice channel"
    },
    leaveWhenUserLeaves: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Leave the voice channel when the user leaves. (That can cause you to sometimes enter infinite leave/join loop)"
    }
});

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { channel, user }: UserContextProps) => {
    if (UserStore.getCurrentUser().id === user.id || !RelationshipStore.getFriendIDs().includes(user.id)) return;

    const [checked, setChecked] = React.useState(followedUserInfo?.userId === user.id);

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuCheckboxItem
            id="fvu-follow-user"
            label="Follow User"
            checked={checked}
            action={() => {
                if (followedUserInfo?.userId === user.id) {
                    followedUserInfo = null;
                    setChecked(false);
                    return;
                }

                followedUserInfo = {
                    lastChannelId: UserStore.getCurrentUser().id,
                    userId: user.id
                };
                setChecked(true);
            }}
        ></Menu.MenuCheckboxItem>
    );
};


export default definePlugin({
    name: "FollowVoiceUser",
    description: "Follow a friend in voice chat.",
    authors: [EquicordDevs.TheArmagan],
    settings,
    settingsAboutComponent: () => <>
        <Forms.FormText className="plugin-warning">
            This Plugin is used to follow a Friend/Friends into voice chat(s).
        </Forms.FormText>
    </>,
    flux: {
        async VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (!followedUserInfo) return;
            if (!RelationshipStore.getFriendIDs().includes(followedUserInfo.userId)) return;

            if (
                settings.store.onlyWhenInVoice
                && VoiceStateStore.getVoiceStateForUser(UserStore.getCurrentUser().id) === null
            ) return;

            voiceStates.forEach(voiceState => {
                if (
                    voiceState.userId === followedUserInfo!.userId
                    && voiceState.channelId
                    && voiceState.channelId !== followedUserInfo!.lastChannelId
                ) {
                    followedUserInfo!.lastChannelId = voiceState.channelId;
                    voiceChannelAction.selectVoiceChannel(followedUserInfo!.lastChannelId);
                } else if (
                    voiceState.userId === followedUserInfo!.userId
                    && !voiceState.channelId
                    && settings.store.leaveWhenUserLeaves
                ) {
                    voiceChannelAction.selectVoiceChannel(null);
                }
            });
        }
    },
    contextMenus: {
        "user-context": UserContextMenuPatch
    }
});
