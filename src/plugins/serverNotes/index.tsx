/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    findGroupChildrenByChildId,
    NavContextMenuPatchCallback
} from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { Menu, React } from "@webpack/common";
import { Guild } from "discord-types/general";

import { openAllNotesViewerModal } from "./allNotesViewerModal";
import { openServerNotesModal } from "./serverNotesModal"; //

const PLUGIN_NAME = "ServerNotes";

const makeServerNotesContextMenuPatch = (isGuildHeader: boolean): NavContextMenuPatchCallback => {
    return (children, props) => {
        const { guild } = props as { guild?: Guild | null; };

        const targetGroupId = isGuildHeader ? "developer-mode" : "privacy";
        let group = findGroupChildrenByChildId(targetGroupId, children);
        if (!group) {
            group = children;
        }
        const isActualServer = guild && typeof guild.id === "string" && /^\d+$/.test(guild.id);

        if (isActualServer) {
            if (!group.some(item => item?.props?.id === "vc-server-notes")) {
                group.push(
                    <Menu.MenuItem
                        id="vc-server-notes"
                        label="Server Note"
                        action={() => openServerNotesModal(guild)}
                    />
                );
            }
        }

        if (!group.some(item => item?.props?.id === "vc-all-server-notes")) {
            group.push(
                <Menu.MenuItem
                    id="vc-all-server-notes"
                    label="View All Server Notes"
                    action={() => openAllNotesViewerModal()}
                />
            );
        }
        return children;
    };
};

export default definePlugin({
    name: PLUGIN_NAME,
    description: "Take per-server notes and view all notes.",
    authors: [
        { name: "m3rcury_", id: 0n }
    ],
    contextMenus: {
        "guild-context": makeServerNotesContextMenuPatch(false),
        "guild-header-popout": makeServerNotesContextMenuPatch(true)
    },
});
