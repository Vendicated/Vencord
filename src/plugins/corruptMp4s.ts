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

import { ApplicationCommandOptionType, sendBotMessage } from "../api/Commands";
import { findOption } from "../api/Commands/commandHelpers";
import { ApplicationCommandInputType } from "../api/Commands/types";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { findByCode, findByProps } from "../webpack";

const DRAFT_TYPE = 0;

export default definePlugin({
    name: "CorruptMp4s",
    description: "Create corrupt mp4s with extremely high or negative duration",
    authors: [Devs.Ven],
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "corrupt",
        description: "Create a corrupt mp4 with extremely high or negative duration",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "mp4",
                description: "the video to corrupt",
                type: ApplicationCommandOptionType.ATTACHMENT,
                required: true
            },
            {
                name: "kind",
                description: "the kind of corruption",
                type: ApplicationCommandOptionType.STRING,
                choices: [
                    {
                        name: "infinite",
                        value: "infinite",
                        label: "Very high duration"
                    },
                    {
                        name: "negative",
                        value: "negative",
                        label: "Negative duration"
                    }
                ]
            }
        ],
        execute: async (args, ctx) => {
            const UploadStore = findByProps("getUploads");
            const upload = UploadStore.getUploads(ctx.channel.id, DRAFT_TYPE)[0];

            const video = upload?.item?.file as File | undefined;

            if (video?.type !== "video/mp4")
                return void sendBotMessage(ctx.channel.id, {
                    content: "Please upload a mp4 file"
                });

            const corruption = findOption<string>(args, "kind", "infinite");

            const buf = new Uint8Array(await video.arrayBuffer());
            let found = false;

            // adapted from https://github.com/GeopJr/exorcism/blob/c9a12d77ccbcb49c987b385eafae250906efc297/src/App.svelte#L41-L48
            for (let i = 0; i < buf.length; i++) {
                if (buf[i] === 0x6d && buf[i + 1] === 0x76 && buf[i + 2] === 0x68 && buf[i + 3] === 0x64) {
                    let start = i + 18;
                    buf[start++] = 0x00;
                    buf[start++] = 0x01;
                    buf[start++] = corruption === "negative" ? 0xff : 0x7f;
                    buf[start++] = 0xff;
                    buf[start++] = 0xff;
                    buf[start++] = corruption === "negative" ? 0xf0 : 0xff;
                    found = true;
                    break;
                }
            }

            if (!found) {
                return void sendBotMessage(ctx.channel.id, {
                    content: "Could not find signature. Is this even a mp4?"
                });
            }

            const newName = video.name.replace(/\.mp4$/i, ".corrupt.mp4");
            const promptToUpload = findByCode("UPLOAD_FILE_LIMIT_ERROR");
            const file = new File([buf], newName, { type: "video/mp4" });
            setImmediate(() => promptToUpload([file], ctx.channel, DRAFT_TYPE));
        }
    }]
});
