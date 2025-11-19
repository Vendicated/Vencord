/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Gif } from "@equicordplugins/gifCollections/types";
import { RestAPI } from "@webpack/common";

async function fetchMessageFromAPI(channelId: string, messageId: string): Promise<any> {
    try {
        const response = await RestAPI.get({
            url: `/channels/${channelId}/messages`,
            query: {
                limit: 1,
                around: messageId
            }
        });

        if (response.ok && response.body.length > 0) {
            return response.body.find((m: any) => m.id === messageId);
        }
    } catch (error) {
        console.error("Failed to fetch message for GIF refresh:", error);
    }
    return null;
}

export async function refreshGifUrl(gif: Gif): Promise<Gif | null> {
    if (!gif.channelId || !gif.messageId || !gif.attachmentId) {
        return null;
    }

    const message = await fetchMessageFromAPI(gif.channelId, gif.messageId);
    if (!message) {
        return null;
    }

    const attachment = message.attachments?.find((a: any) => a.id === gif.attachmentId);
    if (!attachment) {
        return null;
    }

    return {
        ...gif,
        src: attachment.proxy_url,
        url: attachment.url
    };
}
