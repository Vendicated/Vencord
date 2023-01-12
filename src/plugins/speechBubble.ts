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

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, CommandContext, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { makeLazy } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";


const promptToUpload = findByCodeLazy("UPLOAD_FILE_LIMIT_ERROR");
const fetchUser = findByCodeLazy(".USER(");
const UploadStore = findByPropsLazy("getUploads");

const baseImage = makeLazy(() => loadImage("https://raw.githubusercontent.com/Rapougnac/not-useful/mistress/6wb7ea.png"));

const DRAFT_TYPE = 0;


function loadImage(source: File | string) {
    const isFile = source instanceof File;
    const url = isFile ? URL.createObjectURL(source) : source;

    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();

        img.addEventListener("load", () => {
            if (isFile) {
                URL.revokeObjectURL(url);
            }

            resolve(img);
        });

        img.addEventListener("error", event => {
            reject(event.error);
        });

        img.crossOrigin = "Anonymous";
        img.src = url;
    });
}

async function resolveImage(options: Argument[], ctx: CommandContext, noServerPfp: boolean): Promise<File | string | null> {
    for (const opt of options) {
        switch (opt.name) {
            case "image":
                const upload = UploadStore.getUploads(ctx.channel.id, DRAFT_TYPE)[0];
                if (upload) {
                    if (!upload.isImage) throw "Upload is not an image";
                    return upload.item.file;
                }
                break;
            case "url":
                return opt.value;
            case "user":
                try {
                    const user = await fetchUser(opt.value);
                    return user.getAvatarURL(noServerPfp ? void 0 : ctx.guild?.id, 2048).replace(/\?size=\d+$/, "?size=2048");
                } catch (err) {
                    console.error("[SpeechBubble] Failed to fetch user\n", err);
                    throw "Failed to fetch user. Check the console for more info.";
                }
        }
    }
    return null;
}

export default definePlugin({
    name: "SpeechBubble",
    description: "Adds a speech bubble in the top of an image",
    authors: [Devs.Rapougnac],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "speech-bubble",
            description: "Add a speech bubble on top of the image",
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
                },
                {
                    name: "user",
                    description: "User whose avatar to use as image",
                    type: ApplicationCommandOptionType.USER
                },
                {
                    name: "no-server-pfp",
                    description: "Use the normal avatar instead of the server specific one when using the 'user' option",
                    type: ApplicationCommandOptionType.BOOLEAN
                },
                {
                    name: "text",
                    description: "The text to write on the speech bubble",
                    type: ApplicationCommandOptionType.STRING
                }
            ],

            async execute(args, ctx) {
                const noServerPfp: boolean = findOption(args, "no-server-pfp", false);
                const resolution = 512;
                const text: string = findOption(args, "text", "");

                const url = await resolveImage(args, ctx, noServerPfp);

                if (!url) {
                    sendBotMessage(ctx.channel.id, { content: "No image specified" });
                    return;
                }

                const avatar = await loadImage(url);
                const image = await baseImage();

                const maskRatio = calculateAspectRatioFit(image.width, image.height, resolution, resolution);

                const canvas = document.createElement("canvas");
                if (resolution < avatar.width || resolution < avatar.height) {
                    canvas.width = avatar.width;
                    canvas.height = avatar.height;
                } else {
                    canvas.width = canvas.height = resolution;
                }
                const context = canvas.getContext("2d")!;


                context.drawImage(avatar, 0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0, canvas.width, Math.round(maskRatio.height / 1.5));

                if (text !== "") {
                    context.fillStyle = "#FFFFFF";
                    context.textAlign = "center";
                    context.font = context.font.replace(/\d+px/, "24px");
                    context.fillText(text, maskRatio.width / 2, 30, maskRatio.width - 10);
                }


                canvas.toBlob(blob => {
                    const file = new File([blob!], "quote.png", { type: "image/png" });
                    setTimeout(() => promptToUpload([file], ctx.channel, DRAFT_TYPE), 10);
                });
            },
        }
    ]
});

function calculateAspectRatioFit(
    srcWidth: number,
    srcHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number; } {
    const ratio = Math.min(
        maxWidth / srcWidth,
        maxHeight / srcHeight
    );

    return { width: srcWidth * ratio, height: srcHeight * ratio };
}
