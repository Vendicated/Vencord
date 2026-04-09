/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";
import { MessageStore, SnowflakeUtils } from "@webpack/common";

import { settings } from "../settings";
import { Gif } from "../types";
import { cleanUrl } from "./cleanUrl";
import { isAudio } from "./isAudio";
import { uuidv4 } from "./uuidv4";

function isValidSnowflake(snowflake: string): boolean {
    return !Number.isNaN(SnowflakeUtils.extractTimestamp(snowflake));
}

function getGifByTarget(url: string, target?: HTMLElement | null): Gif | null {
    const liElement = target?.closest("li");
    if (!target || !liElement?.id) return null;

    const [channelId, messageId] = liElement.id.split("-").slice(2);
    if (!channelId || !messageId || !isValidSnowflake(channelId) || !isValidSnowflake(messageId)) return null;

    const message = MessageStore.getMessage(channelId, messageId);
    if (!message || (!message.embeds.length && !message.attachments.length)) return null;

    return getGifByMessageAndUrl(url, message);
}

function getGifByMessageAndTarget(target: HTMLElement, message: Message): Gif | null {
    const wrapper = target.closest("[class*=\"imageWrapper\"]");
    const url = wrapper?.querySelector("video")?.src ?? wrapper?.querySelector("img")?.src;
    if (!url) return null;

    return getGifByMessageAndUrl(url, message);
}

function getGifByMessageAndUrl(url: string, message: Message): Gif | null {
    if ((!message.embeds.length && !message.attachments.length) || isAudio(url)) return null;

    const cleanedUrl = cleanUrl(url);

    const embed = message.embeds.find(e => {
        const urls = [
            e.url && cleanUrl(e.url),
            e.image && cleanUrl(e.image.url),
            e.image?.proxyURL,
            e.video?.proxyURL,
            e.thumbnail?.proxyURL,
        ];
        return urls.some(u => u === cleanedUrl);
    });

    if (embed) {
        if (embed.image) {
            return {
                id: uuidv4(settings.store.itemPrefix),
                height: embed.image.height,
                width: embed.image.width,
                src: embed.image.proxyURL!,
                url: embed.image.url,
            };
        }
        if (embed.video?.proxyURL) {
            return {
                id: uuidv4(settings.store.itemPrefix),
                height: embed.video.height,
                width: embed.video.width,
                src: embed.video.proxyURL,
                url: embed.provider?.name === "Tenor" ? embed.url ?? embed.video.url : embed.video.url,
            };
        }
        if (embed.thumbnail?.proxyURL) {
            return {
                id: uuidv4(settings.store.itemPrefix),
                height: embed.thumbnail.height,
                width: embed.thumbnail.width,
                src: embed.thumbnail.proxyURL,
                url: embed.thumbnail.url,
            };
        }
    }

    const attachment = message.attachments.find(a => cleanUrl(a.url) === cleanedUrl || a.proxy_url === cleanedUrl);
    if (attachment) {
        return {
            id: uuidv4(settings.store.itemPrefix),
            height: attachment.height ?? 50,
            width: attachment.width ?? 50,
            src: attachment.proxy_url,
            url: attachment.url,
            channelId: message.channel_id,
            messageId: message.id,
            attachmentId: attachment.id,
        };
    }

    return null;
}

export function getGif(message: Message | null, url: string | null, target: HTMLElement | null): Gif | null {
    if (message && url) return getGifByMessageAndUrl(url, message);
    if (message && target && !url) return getGifByMessageAndTarget(target, message);
    if (url && target && !message) {
        const resolvedUrl = url.startsWith("https://discord.com/")
            ? target.parentElement?.querySelector("img")?.src ?? url
            : url;
        return getGifByTarget(resolvedUrl, target);
    }
    return null;
}
