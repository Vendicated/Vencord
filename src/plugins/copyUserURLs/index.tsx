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

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { LinkIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { ChannelRecord, UserRecord } from "@vencord/discord-types";
import { ClipboardUtils, Menu } from "@webpack/common";

interface UserContextProps {
    channel: ChannelRecord;
    guildId?: string;
    user?: UserRecord;
}

const UserContextMenuPatch = ((children, { user }: UserContextProps) => {
    if (user)
        children.push(
            <Menu.MenuItem
                id="vc-copy-user-url"
                label="Copy User URL"
                action={() => { ClipboardUtils.copy(`<https://discord.com/users/${user.id}>`); }}
                icon={LinkIcon}
            />
        );
}) satisfies NavContextMenuPatchCallback;

export default definePlugin({
    name: "CopyUserURLs",
    authors: [Devs.castdrian],
    description: "Adds a 'Copy User URL' option to the user context menu.",
    contextMenus: {
        "user-context": UserContextMenuPatch
    }
});
