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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { LinkIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Clipboard, Menu } from "@webpack/common";
import type { Guild, User } from "discord-types/general";

interface UserContextProps {
    guildId?: string;
    user: User;
}

interface GuildContextProps {
    guild: Guild;
}

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, user: UserContextProps) => {
    if (!user) return;

    children.push(
        <Menu.MenuItem
            id="vc-copy-user-icon"
            label="Copy User Icon"
            action={() => {
                Clipboard.copy(user.user.getAvatarURL(user.guildId, 1024, true));
            }}
            icon={LinkIcon}
        />
    );
};

const GuildContextMenuPatch: NavContextMenuPatchCallback = (children, { guild }: GuildContextProps) => {
    if (!guild) return;

    children.push(
        <Menu.MenuItem
            id="vc-copy-guild-icon"
            label="Copy Guild Icon"
            action={() => {
                Clipboard.copy(guild.getIconURL(1024, true));
            }}
            icon={LinkIcon}
        />
    );
};



export default definePlugin({
    name: "CopyIconLink",
    description: "Adds a button to copy the link of the icons of users and servers.",
    authors: [Devs.Scyye],
    contextMenus: {
        "guild-context": GuildContextMenuPatch,
        "user-context": UserContextMenuPatch
    },
});
