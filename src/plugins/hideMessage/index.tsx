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

import { HideIcon } from "./HideIcon";

const patchMessageContextMenu: NavContextMenuPatchCallback = (children, { message }) => () => {
    const { deleted, id, channel_id } = message;
    if (deleted) return;

    children.push(
        <Menu.MenuItem
            id="vc-hide-message"
            label="Hide Message"
            color="danger"
            icon={HideIcon}
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

export const cl = classNameFactory("vc-hide-message");

export default definePlugin({
    name: "HideMessage",
    description: "Adds a context menu option to hide messages",
    authors: [Devs.Hanzy],
    patches: [],
    start() {
        addContextMenuPatch("message", patchMessageContextMenu);
    },
    stop() {
        removeContextMenuPatch("message", patchMessageContextMenu);
    }
});
