/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";
import type { Guild } from "discord-types/general";

import { MemberIcon } from "./componenents/icons";
import { openVMWRModal } from "./componenents/ViewMembersModal";

// VMWR: View Members With Role

const makeContextMenuPatch: () => NavContextMenuPatchCallback = () => (children, { guild }: { guild: Guild, onClose(): void; }) => {
    if (!guild) return;

    const group = findGroupChildrenByChildId("privacy", children);
    group?.push(
        <Menu.MenuItem
            label="View members with role"
            id="vmwr-menuitem"
            icon={MemberIcon}
            action={() => openVMWRModal(guild.id)}
        />
    );
};

export default definePlugin({
    name: "ViewMembersWithRole",
    description: "Shows all the members with the selected roles",
    authors: [
        {
            name: "Ryfter",
            id: 898619112350183445n,
        },
    ],
    contextMenus: {
        "guild-header-popout": makeContextMenuPatch()
    },
    start() { },
    stop() { },
});

/*
 * getRolesWithMemberCount: https://discord.com/api/v9/guilds/GUILDID/roles/member-counts
 *
 * getMembersWithRole: https://discord.com/api/v9/guilds/GUILDID/roles/ROLEID/member-ids
 */

