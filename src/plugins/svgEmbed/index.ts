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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";
import Message from "discord-types/general/Message";

const EMBED_SUPPRESSED = 1 << 2;

const MAX_EMBEDS_PER_MESSAGE = 5;
const MIN_SVG_WIDTH = 400;
const MIN_SVG_HEIGHT = 350;
// Limit the size to prevent lag when parsing big files
const MAX_SVG_SIZE_MB = 10;

const URL_REGEX = new RegExp(
    /(?<!<)https?:\/\/(?:(?:canary|ptb)?\.?discord\.com|(?:cdn)\.?discordapp\.(?:com))\/[-a-zA-Z0-9:%_+.~/=]+\.svg[-a-zA-Z0-9:%_+.&?#=]*(?!>)/g,
);

// Cache to avoid excessive requests in component updates
const FileSizeCache: Map<string, number> = new Map();
async function getFileSize(url: string) {
    if (FileSizeCache.has(url)) {
        return FileSizeCache.get(url);
    }

    let size = 0;
    try {
        const res = await fetch(url, { method: "HEAD" });
        const contentLength = res.headers.get("Content-Length");

        if (contentLength) {
            size = parseInt(contentLength);
        }
    } catch (ex) { }

    FileSizeCache.set(url, size);
    return size;
}

async function getSVGDimensions(svgUrl: string) {
    let width = 0, height = 0;
    let svgData: string;

    try {
        const res = await fetch(svgUrl);
        svgData = await res.text();
    } catch (ex) {
        return { width, height };
    }

    const svgElement = new DOMParser().parseFromString(svgData, "image/svg+xml").documentElement as unknown as SVGSVGElement;

    // Return 0,0 on error, so that the renderer falls back to displaying the raw content
    const errorNode = svgElement.querySelector("parsererror");
    if (errorNode) {
        return { width, height };
    }

    if (svgElement.width && svgElement.height && svgElement.width.baseVal.unitType === 1 && svgElement.height.baseVal.unitType === 1) {
        width = svgElement.width.baseVal.value;
        height = svgElement.height.baseVal.value;
    } else {
        width = svgElement.viewBox.baseVal.width;
        height = svgElement.viewBox.baseVal.height;
    }

    // If the dimensions are below the minimum values,
    // scale them up by the smallest integer which makes at least 1 of them exceed it
    if (width < MIN_SVG_WIDTH && height < MIN_SVG_HEIGHT) {
        const multiplier = Math.ceil(Math.min(MIN_SVG_WIDTH / width, MIN_SVG_HEIGHT / height));
        width *= multiplier;
        height *= multiplier;
    }

    return { width, height };
}

const settings = definePluginSettings({
    embedLinks: {
        type: OptionType.BOOLEAN,
        description: "Embed SVG links hosted under discord.com and cdn.discordapp.com",
        default: true,
        restartNeeded: true
    },
});

export default definePlugin({
    name: "SVGEmbed",
    description: "Makes SVG files embed as images.",
    authors: [Devs.amia, Devs.nakoyasha],
    settings: settings,

    patches: [
        {
            find: "isImageFile:function()",
            replacement: {
                match: /(?<=png\|jpe\?g\|webp\|gif\|)/,
                replace: "svg|"
            }
        },
        {
            find: ".Messages.REMOVE_ATTACHMENT_BODY",
            replacement: [
                {
                    match: /(?<=renderAttachments\(\i\){)/,
                    replace: "$self.processAttachments(arguments[0]);"
                },
                {
                    match: /(?<=renderEmbeds\(\i\){)/,
                    predicate: () => settings.store.embedLinks,
                    replace: "$self.processEmbeds(arguments[0]);"
                }
            ]
        }
    ],

    async processAttachments(message: Message) {
        let updateMessage = false;

        const toProcess = message.attachments.filter(x => x.content_type?.startsWith("image/svg+xml") && x.width == null && x.height == null);
        for (const attachment of toProcess) {
            if (attachment.size / 1024 / 1024 > MAX_SVG_SIZE_MB) continue;

            const { width, height } = await getSVGDimensions(attachment.url);
            attachment.width = width;
            attachment.height = height;

            // Change the media.discordapp.net url to use cdn.discordapp.com
            // since the media one will return http 415 for svgs
            attachment.proxy_url = attachment.url;

            updateMessage = true;
        }

        if (updateMessage) {
            FluxDispatcher.dispatch({ type: "MESSAGE_UPDATE", message });
        }
    },

    async processEmbeds(message: Message) {
        if (message.hasFlag(EMBED_SUPPRESSED)) return;

        let updateMessage = false;

        const svgUrls = new Set(message.content.match(URL_REGEX));
        const existingUrls = new Set(message.embeds.filter(x => x.type === "image").map(x => x.image?.url));

        let imageEmbedsCount = existingUrls.size;
        for (const url of [...svgUrls.values()]) {
            if (imageEmbedsCount >= MAX_EMBEDS_PER_MESSAGE) break;
            if (existingUrls.has(url)) continue;

            // Check size of files on the cdn.
            // The files under https://discord.com/assets/* don't return Content-Length
            // but they don't really have to be checked.
            const domain = new URL(url).hostname;
            if (domain === "cdn.discordapp.com") {
                const size = await getFileSize(url);
                if (!size || size / 1024 / 1024 > MAX_SVG_SIZE_MB) continue;
            }

            const { width, height } = await getSVGDimensions(url);
            // @ts-ignore
            message.embeds.push({
                id: "embed_1", // The id can be anything as it seems to be changed by the client anyways
                url,
                type: "image",
                image: { url, proxyURL: url, width, height },
                fields: []
            });

            imageEmbedsCount++;
            updateMessage = true;
        }

        if (updateMessage) {
            FluxDispatcher.dispatch({ type: "MESSAGE_UPDATE", message });
        }
    }
});
