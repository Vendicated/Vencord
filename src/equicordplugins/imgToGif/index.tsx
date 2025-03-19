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

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, CommandContext, sendBotMessage } from "@api/Commands";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { DraftType, UploadHandler, UploadManager } from "@webpack/common";
import { applyPalette, GIFEncoder, quantize } from "gifenc";

const DEFAULT_RESOLUTION = 512;
const FRAMES = 1;

const UploadStore = findByPropsLazy("getUploads");

function loadImage(source: File | string) {
    const isFile = source instanceof File;
    const url = isFile ? URL.createObjectURL(source) : source;

    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (isFile) URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (event, _source, _lineno, _colno, err) => reject(err || event);
        img.crossOrigin = "Anonymous";
        img.src = url;
    });
}

async function resolveImage(options: Argument[], ctx: CommandContext): Promise<{ image: File | null; width: number | null; height: number | null; }> {
    let image: File | null = null;
    let width: number | null = null;
    let height: number | null = null;

    for (const opt of options) {
        switch (opt.name) {
            case "image":
                const upload = UploadStore.getUpload(ctx.channel.id, opt.name, DraftType.SlashCommand);
                if (upload) {
                    if (!upload.isImage) {
                        UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
                        throw "Upload is not an image";
                    }
                    image = upload.item.file;
                }
                break;
            case "width":
                width = Number(opt.value);
                break;
            case "height":
                height = Number(opt.value);
                break;
        }
    }

    UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
    return { image, width, height };
}

export default definePlugin({
    name: "ImgToGif",
    description: "Adds a /imgtogif slash command to create a gif from any image",
    authors: [EquicordDevs.zyqunix],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "imgtogif",
            description: "Allows you to turn an image to a gif",
            options: [
                {
                    name: "image",
                    description: "Image attachment to use",
                    type: ApplicationCommandOptionType.ATTACHMENT
                },
                {
                    name: "width",
                    description: "Width of the gif",
                    type: ApplicationCommandOptionType.INTEGER
                },
                {
                    name: "height",
                    description: "Height of the gif",
                    type: ApplicationCommandOptionType.INTEGER
                }
            ],
            execute: async (opts, cmdCtx) => {
                try {
                    const { image, width, height } = await resolveImage(opts, cmdCtx);
                    if (!image) throw "No Image specified!";

                    const avatar = await loadImage(image);

                    const gifHeight = height ?? DEFAULT_RESOLUTION;
                    const gifWidth = width ?? DEFAULT_RESOLUTION;

                    const gif = GIFEncoder();
                    const canvas = document.createElement("canvas");
                    canvas.width = gifWidth;
                    canvas.height = gifHeight;
                    const ctx = canvas.getContext("2d")!;

                    UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);

                    for (let i = 0; i < FRAMES; i++) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(avatar, 0, 0, avatar.width, avatar.height, 0, 0, canvas.width, canvas.height);

                        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const palette = quantize(data, 256);
                        const index = applyPalette(data, palette);

                        gif.writeFrame(index, canvas.width, canvas.height, {
                            transparent: true,
                            palette,
                        });
                    }

                    gif.finish();
                    const file = new File([gif.bytesView()], "converted.gif", { type: "image/gif" });
                    setTimeout(() => UploadHandler.promptToUpload([file], cmdCtx.channel, DraftType.ChannelMessage), 10);
                } catch (err) {
                    UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);
                    sendBotMessage(cmdCtx.channel.id, { content: String(err) });
                }
            },
        },
    ]
});
