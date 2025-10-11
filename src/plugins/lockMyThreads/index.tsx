/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Menu } from "@webpack/common";

const ThreadActions = findByPropsLazy("lockThread", "archiveThread");

function CreateLockContext(): NavContextMenuPatchCallback {
    return (children, props) => {
        const threadActions = children.find(child => {
            return child?.key === "thread-actions";
        });
        const lockButton = threadActions?.props.children.find(child => {
            return child?.props.id === "lock-thread" || child?.props.id === "unlock-thread";
        });
        if (lockButton) return;
        const archiveButton = threadActions?.props.children.find(child => {
            return child?.props.id === "archive-thread" || child?.props.id === "unarchive-thread";
        });
        if (!archiveButton) return;
        let lockLabel = "Lock Thread";
        if (archiveButton.props?.label?.includes("Post")) lockLabel = "Lock Post";
        const archiveButtonIndex = threadActions?.props.children.indexOf(archiveButton);
        threadActions?.props.children.splice(archiveButtonIndex + 1, 0,
            <Menu.MenuItem
                id={"vc-thread-lock"}
                label={lockLabel}
                action={() => { ThreadActions.lockThread(props.channel); }}
            />);
    };
}

export default definePlugin({
    name: "LockMyThreads",
    description: "Enabled a lock thread button for your own threads, even if you don't have manage threads permission.",
    authors: [Devs.ariflan],
    contextMenus: {
        "thread-context": CreateLockContext()
    }
});
