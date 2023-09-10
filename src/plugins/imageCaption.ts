/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, CommandContext, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";

const promptToUpload = findByCodeLazy("UPLOAD_FILE_LIMIT_ERROR");
const UploadStore = findByPropsLazy("getUploads");

async function resolveImage(options: Argument[], ctx: CommandContext, noServerPfp: boolean): Promise<File | string | null> {
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
    });
}

function canvasToFile(canvas: HTMLCanvasElement) {
    return new Promise<File>((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject("Failed to create blob");
                return;
            }
            resolve(new File([blob], "caption.png"));
        });
    });
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
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
                    description: "Text to caption the image with",
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
                const file = await resolveImage(opts, ctx, false);

                if (!file)
                    return void sendBotMessage(ctx.channel.id, { content: "No image provided" });

                const image = await loadImage(file);

                const canvas = document.createElement("canvas");
                const ctx2d = canvas.getContext("2d")!;

                canvas.width = image.width;
                canvas.height = image.height;

                ctx2d.drawImage(image, 0, 0);
                ctx2d.font = fontSize + "px impact";
                ctx2d.fillStyle = "white";
                ctx2d.strokeStyle = "black";
                ctx2d.lineWidth = 4;
                ctx2d.textAlign = "center";
                ctx2d.textBaseline = position === "top" ? "top" : "bottom";

                const lines = text.split("\n");
                const lineHeight = 40;
                const y = position === "top" ? 15 : image.height - 15;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    const xPos = image.width / 2;
                    const yPos = y + i * lineHeight;

                    ctx2d.strokeText(line, xPos, yPos);
                    ctx2d.fillText(line, xPos, yPos);
                }

                const outputFile = await canvasToFile(canvas);
                // Immediately after the command finishes, Discord clears all input, including pending attachments.
                // Thus, setTimeout is needed to make this execute after Discord cleared the input
                setTimeout(() => promptToUpload([outputFile], ctx.channel, 0), 10);
            }
        }
    ]
});
