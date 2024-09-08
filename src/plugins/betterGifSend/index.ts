/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ExpressionPickerStore, FluxDispatcher, MessageActions, SelectedChannelStore } from "@webpack/common";

interface Gif {
    url: string;
}

const settings = definePluginSettings({
    closeBehavior: {
        type: OptionType.SELECT,
        default: "Close",
        description: "Choose how the GIF Picker behaves after clicking a GIF",
        restartNeeded: false,
        options: [
            { value: "Close", label: "Close immediately" },
            { value: "Open", label: "Always keep open" },
            { value: "ShiftOpen", label: "Keep open if SHIFT is held" }
        ]
    },
    sendBehavior: {
        type: OptionType.SELECT,
        default: "Send",
        description: "Choose how GIFs are added to your chats",
        restartNeeded: false,
        options: [
            { value: "Send", label: "Send immediately" },
            { value: "Insert", label: "Insert into chatbox" },
            { value: "InsertWithShift", label: "Insert link if SHIFT is held" }
        ]
    },
    clearReply: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Clear the reply context after sending a singular GIF",
        restartNeeded: false
    }
});

const PendingReplyStore = findByPropsLazy("getPendingReply");

let shiftHeld = false;

function handleShift(event: KeyboardEvent): void {
    if (event.key === "Shift") {
        shiftHeld = event.type === "keydown";
    }
}

export default definePlugin({
    name: "BetterGifSend",
    description: "Change GIF picker visibility and send (paste/insert) behavior",
    authors: [Devs.Ven, Devs.rya],
    patches: [{
        find: '"handleSelectGIF",',
        replacement: {
            match: /"handleSelectGIF",(\i)=>\{/,
            replace: '"handleSelectGIF",$1=>{if (!this.props.className) return $self.handleSelect($1);'
        }
    }],

    start(): void {
        document.addEventListener("keydown", handleShift);
        document.addEventListener("keyup", handleShift);
    },

    stop(): void {
        document.removeEventListener("keydown", handleShift);
        document.removeEventListener("keyup", handleShift);
    },

    handleSelect(gif?: Gif): void {
        if (!gif) return;

        const channel = SelectedChannelStore.getChannelId();
        const { sendBehavior, closeBehavior } = settings.store;

        if (sendBehavior === "Insert" || (sendBehavior === "InsertWithShift" && shiftHeld)) {
            insertTextIntoChatInputBox(gif.url + " ");
        } else {
            const reply = PendingReplyStore.getPendingReply(channel);
            MessageActions.sendMessage(channel, { content: gif.url }, void 0, true, MessageActions.getSendMessageOptionsForReply(reply));
            if (settings.store.clearReply && reply) {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId: channel });
            }
        }

        if (closeBehavior === "Close" || (closeBehavior === "ShiftOpen" && !shiftHeld)) {
            ExpressionPickerStore.closeExpressionPicker();
        }
    },
    settings
});
