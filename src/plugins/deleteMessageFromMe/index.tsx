/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, Menu } from "@webpack/common";

import { TrashIcon } from "./TrashIcon";

const patchMessageContextMenu: NavContextMenuPatchCallback = (children, { message }) => () => {
    const { deleted, id, channel_id } = message;
    if (deleted) return;

    children.push(
        <Menu.MenuItem
            id="vc-delete-from-me"
            label="Delete Message from Me"
            color="danger"
            icon={TrashIcon}
            action={() => {
                FluxDispatcher.dispatch({
                    type: "MESSAGE_DELETE",
                    channelId: channel_id,
                    id,
                    mlDeleted: true,
                });
            }}
        />
    );
};

export const cl = classNameFactory("vc-delete-from-me-");

export default definePlugin({
    name: "DeleteMessageFromMe",
    description: "Adds a context menu option to delete the message from you",
    authors: [Devs.Hanzy],
    patches: [],
    start() {
        addContextMenuPatch("message", patchMessageContextMenu);
    },
    stop() {
        removeContextMenuPatch("message", patchMessageContextMenu);
    }
});
