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
import { Menu, RestAPI, SelectedChannelStore, SnowflakeUtils } from "@webpack/common";
import type { Channel, User } from "discord-types/general";

interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
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
    // if (!user || user.id === UserStore.getCurrentUser().id) return;
    if (!user) return;

    // Get our current voice channel
    const voiceChannelId = SelectedChannelStore.getVoiceChannelId();
    if (!voiceChannelId) return;

    // Get voice state of the selected user
    const userVoiceState = VoiceStateStore.getVoiceStateForUser(user.id);
    if (!userVoiceState) return;

    // Check if the selected user is in the same channel as us
    if (userVoiceState.channelId !== voiceChannelId) return;

    // const voiceChannel = ChannelStore.getChannel(voiceChannelId);

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

export default definePlugin({
    name: "ContextCommands",
    description: "Adds /voice-kick and /voice-ban shortcuts to user context menus",
    authors: [Devs.Nobody],
    contextMenus: {
        "user-context": UserContextMenuPatch
    }
});
