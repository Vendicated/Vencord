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
import { findByProps, findStoreLazy } from "@webpack";
import { ChannelStore, Menu, PermissionsBits, PermissionStore, UserStore, useStateFromStores } from "@webpack/common";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

const UserContext: NavContextMenuPatchCallback = (children, props) => {

    const user = UserStore.getCurrentUser();

    const userId = user?.id;
    const targetId = props?.user?.id;

    if (targetId === userId) {
        return; // Don't show the option for yourself
    }

    const targetVoiceChannelId = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStateForUser(targetId)?.channelId as string | undefined);
    const targetVoiceChannel = targetVoiceChannelId == null ? undefined : ChannelStore.getChannel(targetVoiceChannelId);

    if (targetVoiceChannel === undefined) {
        return;
    }

    const userVoiceChannelId = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStateForUser(userId)?.channelId as string | undefined);
    const userVoiceChannel = userVoiceChannelId == null ? undefined : ChannelStore.getChannel(userVoiceChannelId);

    if (userVoiceChannel === undefined) {
        return;
    }

    if (userVoiceChannelId === targetVoiceChannelId || userVoiceChannel?.guild_id !== targetVoiceChannel?.guild_id) {
        return;
    }

    if (!PermissionStore.can(PermissionsBits.MOVE_MEMBERS, userVoiceChannel) || !PermissionStore.can(PermissionsBits.MOVE_MEMBERS, targetVoiceChannel)) {
        return;
    }

    const streamPreviewItem = (
        <Menu.MenuItem
            label="Move Here"
            id="move-here-button"
            action={() => {
                findByProps("setChannel").setChannel(userVoiceChannel?.guild_id, targetId, userVoiceChannelId);
            }}
            disabled={false}
        />);

    children.push(<Menu.MenuSeparator/>, streamPreviewItem);
};

export default definePlugin({
    name: "MoveHere",
    description: "This plugin allows you to move a user to the current voice channel.",
    authors: [Devs.PanTruskawka],
    contextMenus: {
        "user-context": UserContext,
    }
});
