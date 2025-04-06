/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, Menu } from "@webpack/common";

const messageCtxPatch: NavContextMenuPatchCallback = (children, { channel, message }) => {
    const group = findGroupChildrenByChildId("delete", children) ?? findGroupChildrenByChildId("report", children);
    if (!group || message.deleted === true) return;

    group.push((
        <Menu.MenuItem
            id="vc-hide"
            label="Hide Message"
            icon={DeleteIcon}
            action={async () => {
                FluxDispatcher.dispatch({
                    type: "MESSAGE_DELETE",
                    channelId: channel.id,
                    id: message.id,
                    mlDeleted: true
                });
            }}
        />
    ));
};

export default definePlugin({
    name: "HideMessage",
    description: "Adds a button to the context menu to locally hide a message (reload to reset)",
    authors: [Devs.scattagain],
    contextMenus: {
        "message": messageCtxPatch
    },
});
