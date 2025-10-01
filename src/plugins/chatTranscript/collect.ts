/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Constants, RestAPI, SnowflakeUtils } from "@webpack/common";
import { Message } from "@vencord/discord-types";

import { FETCH_CHUNK_SIZE } from "./constants";
import type { CollectMessagesOptions } from "./types";

async function collectMessages(channelId: string, options: CollectMessagesOptions): Promise<Message[]> {
    const { limit, startTs, endTs, pivotId, fromStart, onProgress } = options;
    const messages: Message[] = [];

    let before = pivotId ?? (endTs != null ? SnowflakeUtils.fromTimestamp(endTs + 1) : undefined);
    let done = false;

    while (messages.length < limit && !done) {
        const chunk = Math.min(FETCH_CHUNK_SIZE, limit - messages.length);
        const query: Record<string, string | number> = { limit: chunk };
        if (before) query.before = before;

        const res = await RestAPI.get({
            url: Constants.Endpoints.MESSAGES(channelId),
            query,
            retries: 2
        }).catch(error => {
            const reason = error?.message ?? String(error ?? "unknown error");
            throw new Error(`Failed to fetch messages: ${reason}`);
        });

        const batch = (res?.body ?? []) as Message[];
        if (!batch.length) break;

        for (const message of batch) {
            const timestamp = Date.parse(message.timestamp);
            if (Number.isNaN(timestamp)) continue;
            if (endTs != null && timestamp > endTs) continue;
            if (!fromStart && startTs != null && timestamp < startTs) {
                done = true;
                break;
            }

            messages.push(message);
            if (messages.length >= limit) break;
        }

        onProgress?.(messages.length);

        if (messages.length >= limit || done) break;

        const last = batch[batch.length - 1];
        before = last?.id;
        if (!before || batch.length < chunk) break;
    }

    messages.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    return messages;
}

export { collectMessages };

