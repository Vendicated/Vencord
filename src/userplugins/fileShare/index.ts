/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, CommandContext, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { DraftType, UploadManager } from "@webpack/common";

const UploadStore = findByPropsLazy("getUploads");

async function resolveFile(options: Argument[], ctx: CommandContext): Promise<File | null> {
    for (const opt of options) {
        if (opt.name === "file") {
            const upload = UploadStore.getUpload(ctx.channel.id, opt.name, DraftType.SlashCommand);
            return upload.item.file;
        }
    }
    return null;
}

export default definePlugin({
    name: "FileShare",
    description: "Upload your files to gofile.io and share the link in chat via /fileshare slash command.",
    authors: [Devs.ScattrdBlade, Devs.Samu],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "fileshare",
            description: "Upload a file to gofile.io and get the link to share with others",
            options: [
                {
                    name: "file",
                    description: "The file to upload",
                    type: ApplicationCommandOptionType.ATTACHMENT,
                    required: true,
                },
            ],
            execute: async (opts, cmdCtx) => {
                try {
                    const file = await resolveFile(opts, cmdCtx);
                    if (!file) throw "No file specified!";

                    const formData = new FormData();
                    formData.append("file", file);

                    const serverResponse = await fetch("https://api.gofile.io/getServer");
                    const serverData = await serverResponse.json();
                    const { server } = serverData.data;

                    const uploadResponse = await fetch(`https://${server}.gofile.io/uploadFile`, {
                        method: "POST",
                        body: formData,
                    });
                    const uploadResult = await uploadResponse.json();

                    if (uploadResult.status === "ok") {
                        const { downloadPage } = uploadResult.data;
                        UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);
                        setTimeout(() => insertTextIntoChatInputBox(`${downloadPage} `), 10);
                    } else {
                        console.error("Error uploading file:", uploadResult);
                        UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);
                        sendBotMessage(cmdCtx.channel.id, { content: "Error uploading file. Check the console for more info." });
                    }
                } catch (error) {
                    console.error("Error uploading file:", error);
                    UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);
                    sendBotMessage(cmdCtx.channel.id, { content: "Error uploading file. Check the console for more info." });
                }
            },
        },
    ],
});
