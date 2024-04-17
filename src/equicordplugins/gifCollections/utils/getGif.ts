/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { MessageStore, SnowflakeUtils } from "@webpack/common";
import { Message } from "discord-types/general";

import { Gif } from "../types";
import { cleanUrl } from "./cleanUrl";
import { isAudio } from "./isAudio";
import { uuidv4 } from "./uuidv4";

export function getGifByTarget(url: string, target?: HTMLDivElement | null): Gif | null {
    const liElement = target?.closest("li");
    if (!target || !liElement || !liElement.id) return null;

    const [channelId, messageId] = liElement.id.split("-").slice(2);
    // the isValidSnowFlake part may not be nessesery cuse either way (valid or not) message will be undefined if it doenst find a message /shrug
    if (!channelId || !messageId || !isValidSnowFlake(channelId) || !isValidSnowFlake(messageId)) return null;

    const message = MessageStore.getMessage(channelId, messageId);
    if (!message || !message.embeds.length && !message.attachments.length) return null;

    return getGifByMessageAndUrl(url, message);
}


export function getGifByMessageAndTarget(target: HTMLDivElement, message: Message) {
    const url = target.closest('[class^="imageWrapper"]')?.querySelector("video")?.src ?? target.closest('[class^="imageWrapper"]')?.querySelector("img")?.src;

    if (!url) return null;

    return getGifByMessageAndUrl(url, message);
}

export function getGifByMessageAndUrl(url: string, message: Message): Gif | null {
    if (!message.embeds.length && !message.attachments.length || isAudio(url))
        return null;

    const cleanedUrl = cleanUrl(url);

    // find embed with matching url or image/thumbnail url
    const embed = message.embeds.find(e => {
        const hasMatchingUrl = e.url && cleanUrl(e.url) === cleanedUrl;
        const hasMatchingImage = e.image && cleanUrl(e.image.url) === cleanedUrl;
        const hasMatchingImageProxy = e.image?.proxyURL === cleanedUrl;
        const hasMatchingVideoProxy = e.video?.proxyURL === cleanedUrl;
        const hasMatchingThumbnailProxy = e.thumbnail?.proxyURL === cleanedUrl;

        return (
            hasMatchingUrl ||
            hasMatchingImage ||
            hasMatchingImageProxy ||
            hasMatchingVideoProxy ||
            hasMatchingThumbnailProxy
        );
    });
    if (embed) {
        if (embed.image)
            return {
                id: uuidv4(),
                height: embed.image.height,
                width: embed.image.width,
                src: embed.image.proxyURL,
                url: embed.image.url,
            };
        // Tennor
        if (embed.video && embed.video.proxyURL) return {
            id: uuidv4(),
            height: embed.video.height,
            width: embed.video.width,
            src: embed.video.proxyURL,
            url: embed.provider?.name === "Tenor" ? embed.url ?? embed.video.url : embed.video.url,
        };

        // Youtube thumbnails and other stuff idk
        if (embed.thumbnail && embed.thumbnail.proxyURL) return {
            id: uuidv4(),
            height: embed.thumbnail.height,
            width: embed.thumbnail.width,
            src: embed.thumbnail.proxyURL,
            url: embed.thumbnail.url,
        };
    }


    const attachment = message.attachments.find(a => cleanUrl(a.url) === cleanedUrl || a.proxy_url === cleanedUrl);
    if (attachment) return {
        id: uuidv4(),
        height: attachment.height ?? 50,
        width: attachment.width ?? 50,
        src: attachment.proxy_url,
        url: attachment.url
    };

    return null;
}

export const getGif = (message: Message | null, url: string | null, target: HTMLDivElement | null) => {
    if (message && url) {
        const gif = getGifByMessageAndUrl(url, message);
        if (!gif) return null;

        return gif;
    }
    if (message && target && !url) {
        const gif = getGifByMessageAndTarget(target, message);
        if (!gif) return null;

        return gif;
    }
    if (url && target && !message) {
        // youtube thumbnail url is message link for some reason eh
        const gif = getGifByTarget(url.startsWith("https://discord.com/") ? target.parentElement?.querySelector("img")?.src ?? url : url, target);
        if (!gif) return null;

        return gif;
    }
};

function isValidSnowFlake(snowflake: string) {
    return !Number.isNaN(SnowflakeUtils.extractTimestamp(snowflake));
}
