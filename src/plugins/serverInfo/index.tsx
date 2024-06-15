/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { GuildRecord } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

import { openGuildInfoModal } from "./GuildInfoModal";

const Patch = ((children, { guild }: { guild: GuildRecord; }) => {
    const group = findGroupChildrenByChildId("privacy", children);

    group?.push(
        <Menu.MenuItem
            id="vc-server-info"
            label="Server Info"
            action={() => { openGuildInfoModal(guild); }}
        />
    );
}) satisfies NavContextMenuPatchCallback;

migratePluginSettings("ServerInfo", "ServerProfile"); // what was I thinking with this name lmao
export default definePlugin({
    name: "ServerInfo",
    description: "Allows you to view info about a server",
    authors: [Devs.Ven, Devs.Nuckyz],
    tags: ["guild", "info", "ServerProfile"],
    contextMenus: {
        "guild-context": Patch,
        "guild-header-popout": Patch
    }
});
