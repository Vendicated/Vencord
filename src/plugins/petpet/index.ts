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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { makeLazy } from "@utils/lazy";
import definePlugin from "@utils/types";
import { CommandArgument, CommandContext } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { DraftType, UploadHandler, UploadManager, UserUtils } from "@webpack/common";
import { applyPalette, GIFEncoder, quantize } from "gifenc";

const DEFAULT_DELAY = 20;
const DEFAULT_RESOLUTION = 128;
const FRAMES = 10;

const getFrames = makeLazy(() => Promise.all(
    Array.from(
        { length: FRAMES },
        (_, i) => loadImage(`https://raw.githubusercontent.com/VenPlugs/petpet/main/frames/pet${i}.gif`)
    ))
);

const UploadStore = findByPropsLazy("getUploads");

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

async function resolveImage(options: CommandArgument[], ctx: CommandContext, noServerPfp: boolean): Promise<File | string | null> {
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
            case "user":
                try {
                    const user = await UserUtils.getUser(opt.value);
                    return user.getAvatarURL(noServerPfp ? void 0 : ctx.guild?.id, 2048).replace(/\?size=\d+$/, "?size=2048");
                } catch (err) {
                    console.error("[petpet] Failed to fetch user\n", err);
                    UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
                    throw "Failed to fetch user. Check the console for more info.";
                }
        }
    }
    UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
    return null;
}

export default definePlugin({
    name: "petpet",
    description: "Adds a /petpet slash command to create headpet gifs from any image",
    authors: [Devs.Ven],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "petpet",
            description: "Create a petpet gif. You can only specify one of the image options",
            options: [
                {
                    name: "delay",
                    description: "The delay between each frame. Defaults to 20.",
                    type: ApplicationCommandOptionType.INTEGER
                },
                {
                    name: "resolution",
                    description: "Resolution for the gif. Defaults to 120. If you enter an insane number and it freezes Discord that's your fault.",
                    type: ApplicationCommandOptionType.INTEGER
                },
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
                }
            ],
            execute: async (opts, cmdCtx) => {
                const frames = await getFrames();

                const noServerPfp = findOption(opts, "no-server-pfp", false);
                try {
                    var url = await resolveImage(opts, cmdCtx, noServerPfp);
                    if (!url) throw "No Image specified!";
                } catch (err) {
                    UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);
                    sendBotMessage(cmdCtx.channel.id, {
                        content: String(err),
                    });
                    return;
                }

                const avatar = await loadImage(url);

                const delay = findOption(opts, "delay", DEFAULT_DELAY);
                const resolution = findOption(opts, "resolution", DEFAULT_RESOLUTION);

                const gif = GIFEncoder();

                const canvas = document.createElement("canvas");
                canvas.width = canvas.height = resolution;
                const ctx = canvas.getContext("2d")!;

                UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);

                for (let i = 0; i < FRAMES; i++) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    const j = i < FRAMES / 2 ? i : FRAMES - i;
                    const width = 0.8 + j * 0.02;
                    const height = 0.8 - j * 0.05;
                    const offsetX = (1 - width) * 0.5 + 0.1;
                    const offsetY = 1 - height - 0.08;

                    ctx.drawImage(avatar, offsetX * resolution, offsetY * resolution, width * resolution, height * resolution);
                    ctx.drawImage(frames[i], 0, 0, resolution, resolution);

                    const { data } = ctx.getImageData(0, 0, resolution, resolution);
                    const palette = quantize(data, 256);
                    const index = applyPalette(data, palette);

                    gif.writeFrame(index, resolution, resolution, {
                        transparent: true,
                        palette,
                        delay,
                    });
                }

                gif.finish();
                // @ts-ignore This causes a type error on *only some* typescript versions.
                // usage adheres to mdn https://developer.mozilla.org/en-US/docs/Web/API/File/File#parameters
                const file = new File([gif.bytesView()], "petpet.gif", { type: "image/gif" });
                // Immediately after the command finishes, Discord clears all input, including pending attachments.
                // Thus, setTimeout is needed to make this execute after Discord cleared the input
                setTimeout(() => UploadHandler.promptToUpload([file], cmdCtx.channel, DraftType.ChannelMessage), 10);
            },
        },
    ]
});
