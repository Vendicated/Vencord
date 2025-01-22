/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Menu } from "@webpack/common";

import { addChannelToCategory, canMoveChannelInDirection, categories, isPinned, moveChannel, removeChannelFromCategory } from "../data";
import { forceUpdate, PinOrder, settings } from "../index";
import { openCategoryModal } from "./CreateCategoryModal";

function createPinMenuItem(channelId: string) {
    const pinned = isPinned(channelId);

    return (
        <Menu.MenuItem
            id="pin-dm"
            label="Pin DMs"
        >

            {!pinned && (
                <>
                    <Menu.MenuItem
                        id="vc-add-category"
                        label="Add Category"
                        color="brand"
                        action={() => openCategoryModal(null, channelId)}
                    />
                    <Menu.MenuSeparator />

                    {
                        categories.map(category => (
                            <Menu.MenuItem
                                key={category.id}
                                id={`pin-category-${category.id}`}
                                label={category.name}
                                action={() => addChannelToCategory(channelId, category.id).then(forceUpdate)}
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
                        action={() => removeChannelFromCategory(channelId).then(forceUpdate)}
                    />

                    {
                        settings.store.pinOrder === PinOrder.Custom && canMoveChannelInDirection(channelId, -1) && (
                            <Menu.MenuItem
                                id="move-up"
                                label="Move Up"
                                action={() => moveChannel(channelId, -1).then(forceUpdate)}
                            />
                        )
                    }

                    {
                        settings.store.pinOrder === PinOrder.Custom && canMoveChannelInDirection(channelId, 1) && (
                            <Menu.MenuItem
                                id="move-down"
                                label="Move Down"
                                action={() => moveChannel(channelId, 1).then(forceUpdate)}
                            />
                        )
                    }
                </>
            )}

        </Menu.MenuItem>
    );
}

const GroupDMContext: NavContextMenuPatchCallback = (children, props) => {
    const container = findGroupChildrenByChildId("leave-channel", children);
    container?.unshift(createPinMenuItem(props.channel.id));
};

const UserContext: NavContextMenuPatchCallback = (children, props) => {
    const container = findGroupChildrenByChildId("close-dm", children);
    if (container) {
        const idx = container.findIndex(c => c?.props?.id === "close-dm");
        container.splice(idx, 0, createPinMenuItem(props.channel.id));
    }
};

export const contextMenus = {
    "gdm-context": GroupDMContext,
    "user-context": UserContext
};
