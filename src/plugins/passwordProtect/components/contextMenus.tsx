/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Menu } from "@webpack/common";

import { isPasswordProtected } from "../data";
import { openLockModal } from "./lockModal";
import { openUnlockModal } from "./unlockModal";

function createPasswordItem(channelId: string) {
    const isProtected = isPasswordProtected(channelId);

    return (
        <Menu.MenuItem
            id="password-protect"
            label="Password Protect"
        >
            {!isProtected && (
                <>
                    <Menu.MenuItem
                        id="vc-password-protect-lock"
                        label="Lock"
                        color="brand"
                        action={() => openLockModal(channelId)}
                    />
                </>
            )}

            {isProtected && (
                <>
                    <Menu.MenuItem
                        id="vc-password-protect-unlock"
                        label="Unlock"
                        color="danger"
                        action={() => openUnlockModal(channelId)}
                    />
                </>
            )}

        </Menu.MenuItem>
    );
}

const GroupDMContext: NavContextMenuPatchCallback = (children, props) => {
    const container = findGroupChildrenByChildId("leave-channel", children);
    container?.unshift(createPasswordItem(props.channel.id));
};

const UserContext: NavContextMenuPatchCallback = (children, props) => {
    const container = findGroupChildrenByChildId("close-dm", children);
    if (container) {
        const idx = container.findIndex(c => c?.props?.id === "close-dm");
        container.splice(idx, 0, createPasswordItem(props.channel.id));
    }
};

const ChannelContect: NavContextMenuPatchCallback = (children, props) => {
    const container = findGroupChildrenByChildId(["mute-channel", "unmute-channel"], children);
    container?.unshift(createPasswordItem(props.channel.id));
};


export const contextMenus = {
    "gdm-context": GroupDMContext,
    "user-context": UserContext,
    "channel-context": ChannelContect
};
