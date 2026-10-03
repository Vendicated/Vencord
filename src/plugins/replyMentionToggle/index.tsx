/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, SelectedChannelStore } from "@webpack/common";

const isMac = navigator.platform.includes("Mac");
const PendingReplyStore = findStoreLazy("PendingReplyStore");

export default definePlugin({
    name: "ReplyMentionToggle",
    description: "Quickly toggle reply mentions by pressing alt+backspace",
    authors: [Devs.katlyn],

    start() {
        document.addEventListener("keydown", onKeyDown);
    },
    stop() {
        document.removeEventListener("keydown", onKeyDown);
    }
});

function onKeyDown(e: KeyboardEvent) {
    const isBackspace = e.key === "Backspace";
    const altPressed = e.altKey || (!isMac && e.metaKey);
    if (altPressed && isBackspace) {
        toggleReplyMention();
    }
}

function toggleReplyMention(shouldMention?: boolean) {
    const channelId = SelectedChannelStore.getChannelId();
    const reply = PendingReplyStore.getPendingReply(channelId);

    if (!reply) return;

    FluxDispatcher.dispatch({
        type: "SET_PENDING_REPLY_SHOULD_MENTION",
        channelId,
        shouldMention: shouldMention === undefined ? !reply.shouldMention : shouldMention
    });
}
