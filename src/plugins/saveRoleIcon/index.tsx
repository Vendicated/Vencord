/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ImageIcon } from "@components/Icons";
import { getCurrentGuild } from "@utils/discord";
import definePlugin from "@utils/types";
import { GuildStore, Menu } from "@webpack/common";

const RoleContextMenuPatch: NavContextMenuPatchCallback = (children, { id }) => {
    const guild = getCurrentGuild();
    if(!guild) return;

    const role = GuildStore.getRole(guild.id, id);
    if(!role) return;
    if(!role.icon) return;

    children.push(
        <Menu.MenuItem
            id="vc-save-role-icon"
            label="Save Role Icon"
            action={() => {
                window.open("https://cdn.discordapp.com/role-icons/" + role.id + "/" + role.icon + ".png");
            }}
            icon={ImageIcon}
        />

    );
};

export default definePlugin({
    name: "SaveRoleIcon",
    description: "Allows you to save role icons by right-clicking them.",
    authors: [],
    contextMenus: {
        "dev-context": RoleContextMenuPatch
    }
});
