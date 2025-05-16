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
import { LinkIcon } from "@components/Icons";
import { copyToClipboard } from "@utils/clipboard";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";
import type { Channel, User } from "discord-types/general";

interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user) return;

    children.push(
        <Menu.MenuItem
            id="vc-copy-user-url"
            label="Copy User URL"
            action={() => copyToClipboard(`<https://discord.com/users/${user.id}>`)}
            icon={LinkIcon}
        />
    );
};

export default definePlugin({
    name: "CopyUserURLs",
    authors: [Devs.castdrian],
    description: "Adds a 'Copy User URL' option to the user context menu.",
    contextMenus: {
        "user-context": UserContextMenuPatch
    }
});
