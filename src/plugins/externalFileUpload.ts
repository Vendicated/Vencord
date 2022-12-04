/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Samu
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

import { ApplicationCommandInputType, ApplicationCommandOptionType, registerCommand, sendBotMessage, unregisterCommand } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { Settings, Webpack } from "Vencord";

const DRAFT_TYPE = 0;

export default definePlugin({
    name: "ExternalFileUpload",
    description: "Allow for you to upload files to various file upload servers using a slash command (/upload)",
    authors: [Devs.Samu],
    dependencies: ["MessageEventsAPI"],
    options: {
        server: {
            restartNeeded: true,
            type: OptionType.SELECT,
            description: "The upload server. You might have to add credentials depending on server",
            options: [
                {
                    label: "File.io",
                    value: "fileio",
                    default: true
                },
                {
                    label: "Gofile.io",
                    value: "gofileio"
                }
            ]
        },
        loginWarning: {
            type: OptionType.BOOLEAN,
            description: "Warn incase you arent logged into the file server (in optional commands)",
            default: true
        },
        fileiotok: {
            type: OptionType.STRING,
            description: "https://www.file.io/account/apikeys",
        },
        gofileiotok: {
            type: OptionType.STRING,
            description: "https://gofile.io/myProfile",
        }
    },
    async start() {
        switch (Settings.plugins.ExternalFileUpload.server) {
            case "fileio":
                registerCommand({
                    name: "upload",
                    description: "Upload a file to File.io and add a link to your clipboard",
                    inputType: ApplicationCommandInputType.BUILT_IN,
                    options: [
                        {
                            name: "file",
                            description: "The file to upload",
                            type: ApplicationCommandOptionType.ATTACHMENT,
                            required: true
                        }
                    ],
                    // eslint-disable-next-line consistent-return
                    async execute(args, ctx) {
                        if (!Settings.plugins.ExternalFileUpload.fileiotok && Settings.plugins.ExternalFileUpload.loginWarning === true) {
                            sendBotMessage(ctx.channel.id, { content: "File.io token hasnt been set! This isnt required, but will restrict other functions. You can disable this message in plugin settings" });
                        }

                        const UploadStore = findByProps("getUploads");
                        const upload = UploadStore.getUploads(ctx.channel.id, DRAFT_TYPE)[0];

                        const uploadedFile = upload?.item?.file as File;

                        const formData = new FormData();
                        formData.append("file", uploadedFile);

                        fetch("https://file.io/", {
                            method: "POST",
                            body: formData
                        })
                            .then(response => response.json())
                            .then(result => {
                                Webpack.Common.Clipboard.copy(result.link);
                                sendBotMessage(ctx.channel.id, { content: `Successfully uploaded! Copied link to clipboard. ||${result.link}||` });
                            })
                            .catch(error => {
                                console.error("Error:", error);
                                sendBotMessage(ctx.channel.id, { content: "There was an error during upload! Check console" });
                            });
                    },
                }, "ExternalFileUpload");
                break;
            case "gofileio":
                const server = await fetch("https://api.gofile.io/getServer").then(response => response.json());
                registerCommand({
                    name: "upload",
                    description: "Upload a file to Gofile.io and add a link to your clipboard",
                    inputType: ApplicationCommandInputType.BUILT_IN,
                    options: [
                        {
                            name: "file",
                            description: "The file to upload",
                            type: ApplicationCommandOptionType.ATTACHMENT,
                            required: true
                        }
                    ],
                    async execute(args, ctx) {
                        if (!Settings.plugins.ExternalFileUpload.gofileiotok && Settings.plugins.ExternalFileUpload.loginWarning === true) {
                            sendBotMessage(ctx.channel.id, { content: "Gofile.io token hasnt been set! This isnt required, but will restrict other functions. You can disable this message in plugin settings" });
                        }

                        const UploadStore = findByProps("getUploads");
                        const upload = UploadStore.getUploads(ctx.channel.id, DRAFT_TYPE)[0];

                        const uploadedFile = upload?.item?.file as File;

                        const formData = new FormData();
                        formData.append("file", uploadedFile);

                        if (Settings.plugins.ExternalFileUpload.gofileiotok) {
                            formData.append("token", Settings.plugins.ExternalFileUpload.gofileiotok);
                        }

                        fetch(`https://${server.data.server}.gofile.io/uploadFile`, {
                            method: "POST",
                            body: formData
                        })
                            .then(response => response.json())
                            .then(result => {
                                Webpack.Common.Clipboard.copy(result.data.downloadPage);
                                sendBotMessage(ctx.channel.id, { content: `Successfully uploaded! Copied link to clipboard. ||${result.data.downloadPage}||` });
                            })
                            .catch(error => {
                                console.error("Error:", error);
                                sendBotMessage(ctx.channel.id, { content: "There was an error during upload! Check console" });
                            });
                    },
                }, "ExternalFileUpload");
                break;
        }
    },
    stop() {
        unregisterCommand("upload");
    }
});
