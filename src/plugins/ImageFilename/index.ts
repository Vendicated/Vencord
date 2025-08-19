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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const imageFilenameRegex = /(?=[\S])[^\\/:*?"<>|]+\.(?:png|jpe?g|webp|gif|avif)/i;
const gifEmbedProviders = ["tenor.com", "imgur.com", "giphy.com"];

const settings = definePluginSettings({
    showFullUrl: {
        description: "Show the full URL of the image instead of just the filename. Always enabled for GIF embeds.",
        type: OptionType.BOOLEAN,
        default: false,
    },
});

export default definePlugin({
    name: "ImageFilename",
    authors: [Devs.Tiemen, Devs.fawn],
    description: "Display filename of image attachments on hover",
    settings,

    patches: [
        {
            find: ".clickableWrapper",
            replacement: {
                match: /className:.{1,2}\.originalLink,href:(.{1,2}),/,
                replace: (orig, src) => {
                    return `${orig}title:$self.handle(${src}),`;
                }
            }
        },
    ],

    handle(src: string) {
        return (
            (settings.store.showFullUrl || gifEmbedProviders.some(provider => src.includes(provider))
            ? src : src.match(imageFilenameRegex)?.[0]) ?? ""
        );
    }
});
