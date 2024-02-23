/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Menu } from "@webpack/common";

import { addChannelToCategory, canMoveChannelInDirection, categories, isPinned, moveChannel, removeChannelFromCategory } from "../data";
import { forceUpdate, settings } from "../index";
import { openCategoryModal } from "./CreateCategoryModal";

function PinMenuItem(channelId: string) {
    const pinned = isPinned(channelId);

    return (
        <Menu.MenuItem
            id="better-pin-dm"
            label="Pin DMs"
        >

            {!pinned && (
                <>
                    <Menu.MenuItem
                        id="add-category"
                        label="Add Category"
                        color="brand"
                        action={() => openCategoryModal(null, channelId)}
                    />
                    <Menu.MenuSeparator />

                    {
                        categories.map(category => (
                            <Menu.MenuItem
                                id={`pin-category-${category.name}`}
                                label={category.name}
                                action={() => addChannelToCategory(channelId, category.id).then(() => forceUpdate())}
                            />
                        ))
                    }
                </>
            )}

            {pinned && (
                <>
                    <Menu.MenuItem
                        id="unpin-dm"
                        label="Unpin DM"
                        color="danger"
                        action={() => removeChannelFromCategory(channelId).then(() => forceUpdate())}
                    />

                    {
                        !settings.store.sortDmsByNewestMessage && canMoveChannelInDirection(channelId, -1) && (
                            <Menu.MenuItem
                                id="move-up"
                                label="Move Up"
                                action={() => moveChannel(channelId, -1).then(() => forceUpdate())}
                            />
                        )
                    }

                    {
                        !settings.store.sortDmsByNewestMessage && canMoveChannelInDirection(channelId, 1) && (
                            <Menu.MenuItem
                                id="move-down"
                                label="Move Down"
                                action={() => moveChannel(channelId, 1).then(() => forceUpdate())}
                            />
                        )
                    }
                </>
            )}

        </Menu.MenuItem>
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
