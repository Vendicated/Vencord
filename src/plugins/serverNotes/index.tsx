/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { Menu, React } from "@webpack/common";
import { Guild } from "discord-types/general";

import { openAllNotesViewerModal } from "./allNotesViewerModal";
import { openServerNotesModal } from "./serverNotesModal";

const PLUGIN_NAME = "ServerNotes";

const guildContextPatch: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild; }) => {
    let group = findGroupChildrenByChildId("privacy", children);
    if (!group) {
        group = children;
    }

    if (!group.some(item => item && item.props && typeof (item.props as { id?: string; }).id === "string" && (item.props as { id: string; }).id === "vc-server-notes")) {
        group.push(
            <Menu.MenuItem
                id="vc-server-notes"
                label="Server Note"
                action={() => openServerNotesModal(guild)}
            />
        );
    }

    if (!group.some(item => item && item.props && typeof (item.props as { id?: string; }).id === "string" && (item.props as { id: string; }).id === "vc-all-server-notes")) {
        group.push(
            <Menu.MenuItem
                id="vc-all-server-notes"
                label="View All Server Notes"
                action={() => openAllNotesViewerModal()}
            />
        );
    }
};

export default definePlugin({
    name: PLUGIN_NAME,
    description: "Take per-server notes and view all notes.",
    authors: [
        { name: "m3rcury_", id: 0n }
    ],

    start() {
        addContextMenuPatch("guild-context", guildContextPatch);
        addContextMenuPatch("guild-header-popout", guildContextPatch);
    },

    stop() {
        removeContextMenuPatch("guild-context", guildContextPatch);
        removeContextMenuPatch("guild-header-popout", guildContextPatch);
    }
});
