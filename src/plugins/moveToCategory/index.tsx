/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./style.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import type { Channel } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { GuildChannelStore, Menu, PermissionsBits, PermissionStore, RestAPI, showToast, Toasts } from "@webpack/common";

async function moveChannelToCategory(channel: Channel, categoryId: string | null) {
    try {
        await RestAPI.patch({
            url: `/channels/${channel.id}`,
            body: { parent_id: categoryId }
        });
        showToast("Channel moved successfully", Toasts.Type.SUCCESS);
    } catch (e) {
        showToast("Failed to move channel", Toasts.Type.FAILURE);
    }
}

const channelContextMenuPatch: NavContextMenuPatchCallback = (children, { channel, label }: { channel?: Channel; label?: string; }) => {
    if (!channel?.guild_id || channel.isPrivate() || channel.isCategory() || channel.isThread()) return;
    if (label === getIntlMessage("CHANNEL_ACTIONS_MENU_LABEL")) return;
    if (!PermissionStore.can(PermissionsBits.MANAGE_CHANNELS, channel)) return;

    const guildChannels = GuildChannelStore.getChannels(channel.guild_id);
    if (!guildChannels) return;

    const categories = (guildChannels[ChannelType.GUILD_CATEGORY] ?? [])
        .filter(({ channel: cat }) => cat.id !== "null"); // this hides the uncategorized placeholder

    const categoryItems = categories.map(({ channel: cat }) => (
        <Menu.MenuItem
            key={cat.id}
            id={`vc-move-to-category-${cat.id}`}
            label={cat.name}
            action={() => moveChannelToCategory(channel, cat.id)}
        />
    ));

    children.splice(-1, 0, (
        <Menu.MenuItem
            id="vc-move-to-category"
            label="Move to Category"
        >
            <Menu.MenuGroup id="vc-mtc-list">
                <Menu.MenuItem
                    id="vc-move-to-category-none"
                    label="Uncategorized"
                    action={() => moveChannelToCategory(channel, null)}
                />
                {categoryItems}
            </Menu.MenuGroup>
        </Menu.MenuItem>
    ));
};

export default definePlugin({
    name: "MoveToCategory",
    description: "Adds a 'Move to Category' option to the channel right click context menu",
    authors: [Devs.rad],

    contextMenus: {
        "channel-context": channelContextMenuPatch
    }
});
