/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { LinkIcon } from "@components/Icons";
import { copyToClipboard } from "@utils/clipboard";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Channel, User } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

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
