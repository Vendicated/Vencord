/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Menu } from "@webpack/common";

import { isPinned, movePin, PinOrder, settings, snapshotArray, togglePin } from "./settings";

function PinMenuItem(channelId: string) {
    const pinned = isPinned(channelId);
    const canMove = pinned && settings.store.pinOrder === PinOrder.Custom;

    return (
        <>
            <Menu.MenuItem
                id="pin-dm"
                label={pinned ? "Unpin DM" : "Pin DM"}
                action={() => togglePin(channelId)}
            />
            {canMove && snapshotArray[0] !== channelId && (
                <Menu.MenuItem
                    id="move-pin-up"
                    label="Move Pin Up"
                    action={() => movePin(channelId, -1)}
                />
            )}
            {canMove && snapshotArray[snapshotArray.length - 1] !== channelId && (
                <Menu.MenuItem
                    id="move-pin-down"
                    label="Move Pin Down"
                    action={() => movePin(channelId, +1)}
                />
            )}
        </>
    );
}

const GroupDMContext: NavContextMenuPatchCallback = (children, props) => () => {
    const container = findGroupChildrenByChildId("leave-channel", children);
    if (container)
        container.unshift(PinMenuItem(props.channel.id));
};

const UserContext: NavContextMenuPatchCallback = (children, props) => () => {
    const container = findGroupChildrenByChildId("close-dm", children);
    if (container) {
        const idx = container.findIndex(c => c?.props?.id === "close-dm");
        container.splice(idx, 0, PinMenuItem(props.channel.id));
    }
};

export function addContextMenus() {
    addContextMenuPatch("gdm-context", GroupDMContext);
    addContextMenuPatch("user-context", UserContext);
}

export function removeContextMenus() {
    removeContextMenuPatch("gdm-context", GroupDMContext);
    removeContextMenuPatch("user-context", UserContext);
}
