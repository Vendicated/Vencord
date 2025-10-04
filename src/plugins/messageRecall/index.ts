/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import definePlugin from "@utils/types";
import { Devs, IS_MAC } from "@utils/constants";
import { MessageStore, SelectedChannelStore, UserStore, FluxDispatcher, ComponentDispatch } from "@webpack/common";
import { findLazy } from "@webpack";

let DraftModule: any = null;

DraftModule = findLazy(m =>
    m && (m.saveDraft || m.changeDraft || m.clearDraft)
);

let currentMessageId: string | null = null;

export default definePlugin({
    name: "MessageRecall",
    description: "Recall your own previous messages into the textbox with Shift+Up / Shift+Down",
    authors: [Devs.plxne],

    start() {
        document.addEventListener("keydown", onKeyDown, true);
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessageCreate);
    },

    stop() {
        document.removeEventListener("keydown", onKeyDown, true);
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessageCreate);
        currentMessageId = null;
    },

    flux: {
        CHANNEL_SELECT() {
            currentMessageId = null;
        }
    }
});

function onMessageCreate(event: any) {
    const myId = UserStore.getCurrentUser()?.id;
    if (event.message?.author?.id === myId) {
        currentMessageId = null;
    }
}

function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    if (!e.shiftKey) return;
    if (IS_MAC ? e.metaKey : e.ctrlKey) return;
    if (e.altKey) return;

    const channelId = SelectedChannelStore.getChannelId?.();
    if (!channelId) return;

    e.preventDefault();
    e.stopPropagation();

    const messages = MessageStore.getMessages(channelId)?._array ?? [];
    const myId = UserStore.getCurrentUser()?.id;
    if (!myId) return;

    const mine = messages.filter((m: any) => m.author?.id === myId && !m.deleted);
    if (!mine.length) return;

    const idx = mine.findIndex((m: any) => m.id === currentMessageId);
    const next = e.key === "ArrowUp"
        ? (idx <= 0 ? mine[mine.length - 1] : mine[idx - 1])
        : (idx === -1 || idx >= mine.length - 1 ? mine[0] : mine[idx + 1]);

    if (!next) return;
    currentMessageId = next.id;

    replaceComposerText(channelId, next.content ?? "");
}

function replaceComposerText(channelId: string, text: string) {
    DraftModule?.clearDraft?.(channelId);
    DraftModule?.saveDraft?.(channelId, "", 0);

    ComponentDispatch.dispatchToLastSubscribed?.("INSERT_TEXT", {
        rawText: "",
        plainText: ""
    });

    requestAnimationFrame(() => {
        DraftModule?.saveDraft?.(channelId, text, 0);

        ComponentDispatch.dispatchToLastSubscribed?.("INSERT_TEXT", {
            rawText: text,
            plainText: text
        });

        FluxDispatcher.dispatch({
            type: "DRAFT_SAVE",
            channelId,
            draft: { content: text }
        });
    });
}
