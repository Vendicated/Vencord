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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";
import Message from "discord-types/general/Message";

const MinSVGWidth = 400;
const MinSVGHeight = 350;
// Limit the size to prevent lag when parsing big files
const MaxSVGSizeMB = 10;

async function getSVGDimensions(svgUrl: string) {
    let width = 0, height = 0;

    const res = await fetch(svgUrl);
    const svgData = await res.text();

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
    if (width < MinSVGWidth && height < MinSVGHeight) {
        const multiplier = Math.ceil(Math.min(MinSVGWidth / width, MinSVGHeight / height));
        width *= multiplier;
        height *= multiplier;
    }

    return { width, height };
}

export default definePlugin({
    name: "SVGEmbed",
    description: "Makes SVG files embed as images.",
    authors: [Devs.amia, Devs.nakoyasha],

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
            replacement: {
                match: /(?<=renderAttachments\(\i\){)/,
                replace: "$self.processAttachments(arguments[0]);"
            }
        }
    ],

    async processAttachments(message: Message) {
        let updateMessage = false;

        const toProcess = message.attachments.filter(x => x.content_type?.startsWith("image/svg+xml") && x.width == null && x.height == null);
        for (const attachment of toProcess) {
            if (attachment.size / 1024 / 1024 > MaxSVGSizeMB) continue;

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
    }
});
