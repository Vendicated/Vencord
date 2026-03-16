/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UserStore } from "@webpack/common";

import { sendMessageToUser } from "../../../actions/sendMessageAction";
import { resolveRecentDmUsers, resolveUsers } from "../../../query/resolvers";
import type { PalettePageSpec, PaletteSuggestion } from "../types";

const LIMIT = 8;

function resolveRecipientId(recipientInput: string, selectedRecipientId: string | null): string | null {
    if (selectedRecipientId && UserStore.getUser(selectedRecipientId)) {
        return selectedRecipientId;
    }

    const trimmed = recipientInput.trim();
    if (!trimmed) return null;

    const match = resolveUsers(trimmed)[0];
    return match?.user.id ?? null;
}

const sendDmPageSpec: PalettePageSpec = {
    id: "send-dm",
    title: "Send DM",
    submitLabel: "Send DM",
    fields: [
        { key: "recipient", label: "Recipient", type: "picker", placeholder: "Username or display name", suggestionLimit: LIMIT },
        { key: "message", label: "Message", type: "text", placeholder: "Message content" }
    ],
    resolveSuggestions(fieldKey, query) {
        if (fieldKey !== "recipient") return [];

        const trimmed = query.trim();
        const resolved = trimmed.length === 0
            ? resolveRecentDmUsers(LIMIT).map(entry => ({ id: entry.user.id, label: entry.display, iconUrl: entry.iconUrl, kind: "user" as const }))
            : resolveUsers(trimmed).slice(0, LIMIT).map(entry => ({ id: entry.user.id, label: entry.display, iconUrl: entry.iconUrl, kind: "user" as const }));

        return resolved satisfies PaletteSuggestion[];
    },
    validate(context) {
        const message = context.values.message?.trim() ?? "";
        if (!message) return "Message content is required.";

        const recipientId = resolveRecipientId(context.values.recipient ?? "", context.selectedIds.recipient ?? null);
        if (!recipientId) return "Select a valid recipient.";

        return null;
    },
    async submit(context) {
        const recipientId = resolveRecipientId(context.values.recipient ?? "", context.selectedIds.recipient ?? null);
        if (!recipientId) {
            throw new Error("Select a valid recipient.");
        }

        const message = context.values.message?.trim() ?? "";
        if (!message) {
            throw new Error("Message content is required.");
        }

        await sendMessageToUser({
            userId: recipientId,
            content: message
        });

        const recipient = UserStore.getUser(recipientId);
        context.showSuccess(`Message sent to ${recipient?.globalName ?? recipient?.username ?? "recipient"}.`);
    }
};

export default sendDmPageSpec;
