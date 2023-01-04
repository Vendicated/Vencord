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

const defaultSharexConfig = "{\n      \"Version\": \"13.0.1\",\n      \"Name\": \"file.coffee\",\n      \"DestinationType\": \"ImageUploader, TextUploader, FileUploader\",\n      \"RequestMethod\": \"POST\",\n      \"RequestURL\": \"https://file.coffee/api/file/upload\",\n      \"Body\": \"MultipartFormData\",\n      \"FileFormName\": \"file\",\n      \"URL\": \"$json:url$\"\n    }";

const urlRegex = /(?<!")https:\/\//g;

async function makeReq(method: string, url: string, body: XMLHttpRequestBodyInit | null) {
    const httpReq = new XMLHttpRequest();

    httpReq.open(method, `https://cors-bypass.efu-cors-bypass.workers.dev/${url}`);
    await httpReq.send(body);

    return httpReq;
}

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
                },
                {
                    label: "ShareX",
                    value: "sharex"
                },
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
        },
        sharexConfig: {
            type: OptionType.STRING,
            description: "Paste your .sxcu configs content in here",
            default: defaultSharexConfig
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
            case "sharex":
                registerCommand({
                    name: "upload",
                    description: "Upload a file to your own ShareX server and add a link to your clipboard",
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
                        if (Settings.plugins.ExternalFileUpload.sharexConfig === defaultSharexConfig && Settings.plugins.ExternalFileUpload.loginWarning === true) {
                            sendBotMessage(ctx.channel.id, { content: "ShareX config is set as default. We recommend you edit the configuration to your likings (and your preferred host). Right now you are using file.coffee You can disable this message in plugin settings" });
                        }

                        const UploadStore = findByProps("getUploads");
                        const upload = UploadStore.getUploads(ctx.channel.id, DRAFT_TYPE)[0];

                        const uploadedFile = upload?.item?.file as File;

                        let { sharexConfig } = Settings.plugins.ExternalFileUpload;

                        const sharexUrl = (/(?<=\$json:).*(?=\$",)/.exec(sharexConfig));
                        if (sharexUrl === null) return sendBotMessage(ctx.channel.id, { content: "Make sure config returns proper return" });

                        sharexConfig = JSON.parse(sharexConfig);

                        if (sharexConfig.Body === "MultipartFormData") {
                            const body = new FormData();
                            body.append(sharexConfig.FileFormName, uploadedFile);

                            const res = await makeReq(sharexConfig.RequestMethod, sharexConfig.RequestURL, body);

                            res.onload = event => {
                                if (urlRegex.test(res.response)) {
                                    Webpack.Common.Clipboard.copy(res.response);
                                    sendBotMessage(ctx.channel.id, { content: `Successfully uploaded! Copied link to clipboard. ||${res.response}||` });
                                    return;
                                } else {
                                    const resJson = JSON.parse(res.response);

                                    Webpack.Common.Clipboard.copy((sharexConfig.URL).replace(/\$.*?\$/g, "") + resJson[sharexUrl[0]]);
                                    sendBotMessage(ctx.channel.id, { content: `Successfully uploaded! Copied link to clipboard. ||${resJson[sharexUrl[0]]}||` });
                                }
                            };
                        }
                        else return sendBotMessage(ctx.channel.id, { content: "Couldnt complete request. Possibly unsupported Body type?" });
                    },
                }, "ExternalFileUpload");
                break;
        }
    },
    stop() {
        unregisterCommand("upload");
    }
});
