/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, CommandContext, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { getGifEncoder, getGifReader } from "@utils/dependencies";
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Channel } from "discord-types/general";

const promptToUpload = findByCodeLazy("UPLOAD_FILE_LIMIT_ERROR");
const UploadStore = findByPropsLazy("getUploads");

async function resolveImage(options: Argument[], ctx: CommandContext): Promise<File | string | null> {
    for (const opt of options) {
        switch (opt.name) {
            case "image":
                const upload = UploadStore.getUploads(ctx.channel.id, 0)[0];
                if (upload) {
                    if (!upload.isImage) throw "Upload is not an image";
                    return upload.item.file;
                }
                break;
            case "url":
                return opt.value;
        }
    }
    return null;
}

function loadImage(source: File | string) {
    const isFile = source instanceof File;
    const url = isFile ? URL.createObjectURL(source) : source;

    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (isFile)
                URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (event, _source, _lineno, _colno, err) => reject(err || event);
        img.crossOrigin = "Anonymous";
        img.src = url;
        if (isFile) {
            img.setAttribute("data-file-type", source.name.split(".").pop()!);
        }
    });
}

function canvasToFile(canvas: HTMLCanvasElement, fileName: string) {
    return new Promise<File>((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject("Failed to create blob");
                return;
            }
            resolve(new File([blob], `${fileName}.png`));
        });
    });
}

interface FrameData {
    image: ImageData;
    delay: number;
}

async function loadGifFrameList(blob: Blob): Promise<FrameData[]> {
    const GifReader = await getGifReader();

    const arrayBuffer = await blob.arrayBuffer();
    const intArray = new Uint8Array(arrayBuffer);
    const reader = new GifReader(intArray as Buffer);

    const info = reader.frameInfo(0);
    let prevData: ImageData | null = null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    canvas.width = info.width;
    canvas.height = info.height;

    return new Array(reader.numFrames()).fill(0).map((_, k) => {
        const image = prevData || new ImageData(info.width, info.height);

        reader.decodeAndBlitFrameRGBA(k, image.data);

        ctx.putImageData(image, 0, 0);

        prevData = image;

        return {
            image: ctx.getImageData(0, 0, info.width, info.height),
            delay: info.delay
        };
    });
}

export default definePlugin({
    name: "ImageCaption",
    description: "Adds a /caption command to caption images",
    authors: [Devs.MrDiamond],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "caption",
            description: "Caption an image (either \"image\" or \"url\" must be filled out)",
            options: [
                {
                    name: "image",
                    description: "Image attachment to use",
                    type: ApplicationCommandOptionType.ATTACHMENT,
                    required: false
                },
                {
                    name: "url",
                    description: "URL to fetch image from",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
                {
                    name: "text",
                    description: "Text to caption the image with (Use \\n for newlines)",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "position",
                    description: "Position of the text",
                    type: ApplicationCommandOptionType.STRING,
                    choices: [
                        {
                            name: "Top",
                            value: "top",
                            label: "The top of the image"
                        },
                        {
                            name: "Bottom",
                            value: "bottom",
                            label: "The bottom of the image"
                        }
                    ],
                    required: false
                },
                {
                    name: "size",
                    description: "Font size of the text in pixels (default: 60)",
                    type: ApplicationCommandOptionType.INTEGER,
                    required: false
                }
            ],
            execute: async (opts, ctx) => {
                const text = findOption(opts, "text", "");
                const position = findOption(opts, "position", "top");
                const fontSize = findOption(opts, "size", 60);
                const file = await resolveImage(opts, ctx);
                let fileName = "caption";

                if (!file)
                    return void sendBotMessage(ctx.channel.id, { content: "No image provided" });

                if (file instanceof File)
                    fileName = file.name.split(".")[0];

                const image = await loadImage(file).catch(err => {
                    console.error(err);
                    return null;
                });

                if (!image)
                    return void sendBotMessage(ctx.channel.id, { content: "Failed to load image/gif" });

                const canvas = document.createElement("canvas");
                const ctx2d = canvas.getContext("2d")!;

                canvas.width = image.width;
                canvas.height = image.height;

                const isGifUpload = image.dataset.fileType === "gif";
                if (image.src.endsWith(".gif") || isGifUpload) {
                    const { GIFEncoder, quantize, applyPalette } = await getGifEncoder();
                    const gif = new GIFEncoder();

                    const frames = await loadGifFrameList(isGifUpload ?
                        (file as File) :
                        await fetch(image.src).then(r => r.blob())
                    );

                    for (const frame of frames) {
                        ctx2d.putImageData(frame.image, 0, 0);

                        drawText(ctx2d, image, text, fontSize, position);

                        const { data } = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
                        const palette = quantize(data, 256);
                        const index = applyPalette(data, palette);

                        gif.writeFrame(index, canvas.width, canvas.height, {
                            transparent: true,
                            palette,
                            delay: frame.delay
                        });
                    }

                    gif.finish();
                    const gifFile = new File([gif.bytesView()], `${fileName}.gif`, { type: "image/gif" });
                    return void promptUpload(gifFile, ctx.channel);
                }

                ctx2d.drawImage(image, 0, 0);
                drawText(ctx2d, image, text, fontSize, position);

                const outputFile = await canvasToFile(canvas, fileName);

                promptUpload(outputFile, ctx.channel);
            }
        }
    ]
});

function drawText(ctx: CanvasRenderingContext2D, image: HTMLImageElement, text: string, fontSize: number, position: "top" | "bottom") {
    ctx.font = fontSize + "px impact";
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.textAlign = "center";
    ctx.textBaseline = position === "top" ? "top" : "bottom";

    const lines = text.split("\\n");
    const lineHeight = 40;
    const y = position === "top" ? 15 : image.height - 15;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const xPos = image.width / 2;
        const yPos = y + i * lineHeight;

        ctx.strokeText(line, xPos, yPos);
        ctx.fillText(line, xPos, yPos);
    }
}

function promptUpload(file: File, channel: Channel) {
    // Immediately after the command finishes, Discord clears all input, including pending attachments.
    // Thus, setTimeout is needed to make this execute after Discord cleared the input
    setTimeout(() => promptToUpload([file], channel, 0), 10);
}
