/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";

import { NON_SYSTEM_MESSAGE_TYPES } from "./constants";
import type { FilterOptions } from "./types";
import { messageHasMedia, messageMatchesKeyword } from "./utils";

function applyFilters(messages: Message[], options: FilterOptions): Message[] {
    const {
        startTs,
        endTs,
        includeBots,
        includeSystem,
        onlyPinned,
        onlyWithMedia,
        authorIds,
        keyword,
        includeAttachments,
        includeEmbeds
    } = options;

    const trimmedKeyword = keyword.trim();

    return messages.filter(message => {
        const timestamp = Date.parse(message.timestamp);
        if (Number.isNaN(timestamp)) return false;
        if (startTs != null && timestamp < startTs) return false;
        if (endTs != null && timestamp > endTs) return false;
        if (!includeBots && message.author?.bot) return false;
        if (!includeSystem && !NON_SYSTEM_MESSAGE_TYPES.has(message.type as number)) return false;
        if (onlyPinned && !message.pinned) return false;
        if (onlyWithMedia && !messageHasMedia(message)) return false;
        if (authorIds && (!message.author || !authorIds.has(message.author.id))) return false;
        if (trimmedKeyword && !messageMatchesKeyword(message, trimmedKeyword, includeAttachments, includeEmbeds)) return false;
        return true;
    });
}

export { applyFilters };

