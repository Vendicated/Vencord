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
import { DataStore } from "@api/index";
import { Menu, RelationshipStore } from "@webpack/common";

import { tabs, tabsKey, updateTabs } from "../utils";

const ChannelTypes = {
    GUILD_CHANNEL: 0,
    USER_CHANNEL: 1,
    GUILD_VOICE: 2,
    GROUP_DM_CHANNEL: 3,
    GUILD_CATEGORY: 4,
} as const;

export const ContextMenu: NavContextMenuPatchCallback = (children, props) => {
    if (![
        ChannelTypes.GUILD_CHANNEL,
        ChannelTypes.USER_CHANNEL,
        ChannelTypes.GROUP_DM_CHANNEL
    ].includes(props.channel.type)) return () => { };

    return () => {
        const channelId = props.channel.id;
        if (tabs.has(channelId)) return;

        const nickname = RelationshipStore.getNickname(props.user?.id || "");

        async function handleAddTab() {
            const name = props.channel.name || nickname || props.user.username;
            tabs.set(channelId, {
                channelId: channelId,
                name: name,
                description: props.guild?.name || "DM Channel",
                isFavorite: false,
                guildId: props.guild?.id ?? null,
                notificationCount: 0
            });

            // Persist data
            await DataStore.set(tabsKey(), tabs);
            updateTabs();
        }

        children.push(
            <Menu.MenuItem
                id="create-a-tab"
                label="Create a tab"
                action={handleAddTab}
            />
        );
    };
};
