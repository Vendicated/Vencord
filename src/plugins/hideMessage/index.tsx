/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { updateMessage } from "@api/MessageUpdater";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";
import { Message } from "discord-types/general";

const HideIcon = () => {
    // Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools
    // https://www.svgrepo.com/svg/374906/hide
    return <svg fill="currentColor" width="18" height="18" viewBox="0 0 52 52">
        <path d="M51.8,25.1c-1.6-3.2-3.7-6.1-6.3-8.4L37,25.1c0,0.3,0,0.6,0,0.9c0,6.1-4.9,11-11,11c-0.3,0-0.6,0-0.9,0 l-5.4,5.4c2,0.4,4.1,0.7,6.2,0.7c11.3,0,21.1-6.6,25.8-16.1C52.1,26.3,52.1,25.7,51.8,25.1z" />
        <path d="M48.5,5.6l-2.1-2.1C45.8,2.9,44.7,3,44,3.8l-7.3,7.3C33.4,9.7,29.8,9,26,9C14.7,9,4.9,15.6,0.2,25.1 c-0.3,0.6-0.3,1.3,0,1.8c2.2,4.5,5.5,8.2,9.6,11L3.8,44c-0.7,0.7-0.8,1.8-0.3,2.4l2.1,2.1C6.2,49.1,7.3,49,8,48.2L48.2,8 C49,7.3,49.1,6.2,48.5,5.6z M15,26c0-6.1,4.9-11,11-11c2,0,3.8,0.5,5.4,1.4l-3,3C27.6,19.2,26.8,19,26,19c-3.9,0-7,3.1-7,7 c0,0.8,0.2,1.6,0.4,2.4l-3,3C15.5,29.8,15,28,15,26z" />
    </svg>;
};

function hideMessage(message: Message) {
    updateMessage(message.channel_id, message.id, { blocked: true });
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }) => {
    const group = findGroupChildrenByChildId("copy-link", children) ?? children;
    const index = group.findIndex(c => c?.props.id === "copy-link");
    group.splice(index + 1, 0,
        <Menu.MenuItem
            id={"vc-hide-message"}
            label="Hide message"
            action={() => hideMessage(message)}
            icon={HideIcon}
        />
    );
};

export default definePlugin({
    name: "HideMessage",
    description: "Hide a message without blocking the user.",
    authors: [Devs.garlicOS],
    contextMenus: {
        "message": messageContextMenuPatch,
        "message-actions": messageContextMenuPatch,
    }
});
