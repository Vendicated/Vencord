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

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, CommandContext, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { DraftType, UploadHandler, UploadManager, UserUtils } from "@webpack/common";
import { applyPalette, GIFEncoder, quantize } from "gifenc";


const UploadStore = findByPropsLazy("getUploads");


async function resolveImage(options: Argument[], ctx: CommandContext): Promise<File | string | null> {
    for (const opt of options) {
        switch (opt.name) {
            case "image":
                const upload = UploadStore.getUpload(ctx.channel.id, opt.name, DraftType.SlashCommand);
                if (upload) {
                    if (!upload.isImage) {
                        UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
                        throw "Upload is not an image";
                    }
                    return upload.item.file;
                }
                break;
            case "url":
                return opt.value;
        }
    }
    UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
    return null;
}

export default definePlugin({
    name: "To GIF",
    description: "Converts any image to .gif format (adds a /gif slash command)",
    authors: [Devs.Stage],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "gif",
            description: "Convert an image to .gif format. You can only specify one of the image options!",
            options: [
                {
                    name: "image",
                    description: "Image attachment to use",
                    type: ApplicationCommandOptionType.ATTACHMENT
                },
                {
                    name: "url",
                    description: "URL to fetch image from",
                    type: ApplicationCommandOptionType.STRING
                }
            ],
            execute: async (opts, cmdCtx) => {
                try {
                    var image = await resolveImage(opts, cmdCtx);
                    if (!image) throw "No Image specified!";
                } catch (err) {
                    UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);
                    sendBotMessage(cmdCtx.channel.id, {
                        content: String(err),
                    });
                    return;
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;
                const resolution = 512;

                UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);

                canvas.width = resolution;
                canvas.height = resolution;
                ctx.drawImage(image, 0, 0, resolution, resolution);

                const imageData = ctx.getImageData(0, 0, resolution, resolution);
                const { data } = imageData;

                const gif = GIFEncoder();

                const palette = quantize(data, 512);
                const index = applyPalette(data, palette);

                gif.writeFrame(index, resolution, resolution, {
                    palette,
                    delay: 100,
                });

                gif.finish();

                const file = new File([gif.bytesView()], "converted.gif", { type: "image/gif" });
                // Immediately after the command finishes, Discord clears all input, including pending attachments.
                // Thus, setTimeout is needed to make this execute after Discord cleared the input
                setTimeout(() => UploadHandler.promptToUpload([file], cmdCtx.channel, DraftType.ChannelMessage), 10);
            },
        },
    ]
});