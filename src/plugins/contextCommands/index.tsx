/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Menu, RestAPI, SelectedChannelStore, SnowflakeUtils, UserStore } from "@webpack/common";
import type { Channel, User } from "discord-types/general";

interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

interface ChannelContextProps {
    channel: Channel;
}

const VoiceStateStore = findStoreLazy("VoiceStateStore");

function sendMessage(channelId: string, content: string) {
    RestAPI.post({
        url: `/channels/${channelId}/messages`,
        body: {
            channel_id: channelId,
            content: content,
            nonce: SnowflakeUtils.fromTimestamp(Date.now()),
            sticker_ids: [],
            type: 0,
            attachments: [],
            message_reference: null,
        }
    });
}

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;

    // Get our current voice channel
    const voiceChannelId = SelectedChannelStore.getVoiceChannelId();
    if (!voiceChannelId) return;

    // Get voice state of the selected user
    const userVoiceState = VoiceStateStore.getVoiceStateForUser(user.id);
    if (!userVoiceState) return;

    // Check if the selected user is in the same channel as us
    if (userVoiceState.channelId !== voiceChannelId) return;

    children.push(
        <Menu.MenuItem
            id="vc-kick-user"
            label="Kick user"
            action={() => sendMessage(voiceChannelId, `!voice-kick <@${userVoiceState.userId}>`)}
        />
    );
    children.push(
        <Menu.MenuItem
            id="vc-ban-user"
            label="Ban user"
            action={() => sendMessage(voiceChannelId, `!voice-ban <@${userVoiceState.userId}>`)}
        />
    );
};

const ChannelContextMenuPatch: NavContextMenuPatchCallback = (children, { channel }: ChannelContextProps) => {
    if (!channel) return;

    // Ignore non-voice channels
    if (channel.type !== 2) return;

    children.push(
        <Menu.MenuItem
            id="vc-change-limit"
            label="Change user limit"
        >
            <Menu.MenuItem
                id={"vc-change-limit-1"}
                label="1"
                action={() => sendMessage(channel.id, "!voice-limit 1")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-2"}
                label="2"
                action={() => sendMessage(channel.id, "!voice-limit 2")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-3"}
                label="3"
                action={() => sendMessage(channel.id, "!voice-limit 3")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-4"}
                label="4"
                action={() => sendMessage(channel.id, "!voice-limit 4")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-5"}
                label="5"
                action={() => sendMessage(channel.id, "!voice-limit 5")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-6"}
                label="6"
                action={() => sendMessage(channel.id, "!voice-limit 6")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-7"}
                label="7"
                action={() => sendMessage(channel.id, "!voice-limit 7")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-8"}
                label="8"
                action={() => sendMessage(channel.id, "!voice-limit 8")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-9"}
                label="9"
                action={() => sendMessage(channel.id, "!voice-limit 9")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-10"}
                label="10"
                action={() => sendMessage(channel.id, "!voice-limit 10")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-11"}
                label="11"
                action={() => sendMessage(channel.id, "!voice-limit 11")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-12"}
                label="12"
                action={() => sendMessage(channel.id, "!voice-limit 12")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-13"}
                label="13"
                action={() => sendMessage(channel.id, "!voice-limit 13")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-14"}
                label="14"
                action={() => sendMessage(channel.id, "!voice-limit 14")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-15"}
                label="15"
                action={() => sendMessage(channel.id, "!voice-limit 15")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-16"}
                label="16"
                action={() => sendMessage(channel.id, "!voice-limit 16")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-17"}
                label="17"
                action={() => sendMessage(channel.id, "!voice-limit 17")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-18"}
                label="18"
                action={() => sendMessage(channel.id, "!voice-limit 18")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-19"}
                label="19"
                action={() => sendMessage(channel.id, "!voice-limit 19")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-20"}
                label="20"
                action={() => sendMessage(channel.id, "!voice-limit 20")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-21"}
                label="21"
                action={() => sendMessage(channel.id, "!voice-limit 21")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-22"}
                label="22"
                action={() => sendMessage(channel.id, "!voice-limit 22")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-23"}
                label="23"
                action={() => sendMessage(channel.id, "!voice-limit 23")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-24"}
                label="24"
                action={() => sendMessage(channel.id, "!voice-limit 24")}
            />
            <Menu.MenuItem
                id={"vc-change-limit-25"}
                label="25"
                action={() => sendMessage(channel.id, "!voice-limit 25")}
            />
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "ContextCommands",
    description: "Adds command shortcuts to context menus (!voice-kick, !voice-ban, !voice-limit)",
    authors: [Devs.Nobody],
    contextMenus: {
        "user-context": UserContextMenuPatch,
        "channel-context": ChannelContextMenuPatch
    }
});
