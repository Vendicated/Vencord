/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Menu } from "@webpack/common";
import { Channel, Message } from "@vencord/discord-types";

import { openTranscriptModal } from "./modal";
import { isTextBasedChannel, safeGetChannel } from "./utils";

const CHANNEL_ITEM_ID = "vc-transcript-channel";
const MESSAGE_ITEM_ID = "vc-transcript-message";

const channelContextPatch: NavContextMenuPatchCallback = (children, props) => {
    const channel = props.channel as Channel | undefined;
    if (!isTextBasedChannel(channel)) return;

    const container = findGroupChildrenByChildId("mark-channel-read", children)
        ?? findGroupChildrenByChildId("close-dm", children)
        ?? children;

    container.push(
        <Menu.MenuItem
            id={CHANNEL_ITEM_ID}
            label="Export Transcript..."
            action={() => openTranscriptModal({ channelId: channel.id })}
        />
    );
};

const dmContextPatch: NavContextMenuPatchCallback = (children, props) => {
    const channel = props.channel as Channel | undefined;
    if (!isTextBasedChannel(channel)) return;

    const container = findGroupChildrenByChildId("close-dm", children)
        ?? findGroupChildrenByChildId("leave-channel", children)
        ?? children;

    container.push(
        <Menu.MenuItem
            id="vc-transcript-dm"
            label="Export Transcript..."
            action={() => openTranscriptModal({ channelId: channel.id })}
        />
    );
};

const messageContextPatch: NavContextMenuPatchCallback = (children, props) => {
    const message = props.message as Message | undefined;
    if (!message) return;

    const channel = safeGetChannel(message.channel_id);
    if (!isTextBasedChannel(channel)) return;

    children.push(
        <Menu.MenuItem
            id={MESSAGE_ITEM_ID}
            label="Export Transcript from here..."
            action={() => openTranscriptModal({ channelId: channel.id, message })}
        />
    );
};

const contextMenus = {
    "channel-context": channelContextPatch,
    "thread-context": channelContextPatch,
    "gdm-context": channelContextPatch,
    "user-context": dmContextPatch,
    "message": messageContextPatch
};

export { contextMenus };

