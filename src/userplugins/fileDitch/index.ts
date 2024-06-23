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

import { SelectedChannelStore } from "@webpack/common";
import { popNotice, showNotice } from "@api/Notices";
import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";

const DRAFT_TYPE = 0;

export default definePlugin({
    name: "FileDitch",
    description: "Allows you to upload files to FileDitch and send them to others",
    authors: [
        Devs.Samu,
        {
            name: "he3als",
            id: 701060813506478090n
        }
    ],
    dependencies: ["MessageEventsAPI"],
    target: "DESKTOP",
    commands: [{
        name: "fd",
        description: "Upload a file to FileDitch and adds it to your clipboard",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "file",
                description: "The file to upload",
                type: ApplicationCommandOptionType.ATTACHMENT,
                required: true
            }
        ],
        execute: async (args, ctx) => {
            const UploadStore = findByProps("getUploads");
            const upload = UploadStore.getUploads(ctx.channel.id, DRAFT_TYPE)[0];

            const uploadedFile = upload?.item?.file as File;

            const formData = new FormData();
            formData.append("files[]", uploadedFile);

            fetch(`https://up1.fileditch.com/upload.php`, {
                method: "POST",
                body: formData
            })
                .then(response => response.json())
                .then(result => {
                    // sendBotMessage(SelectedChannelStore.getChannelId(), { content: "Completed! FileDitch URL copied to clipboard.\nembeds.video: https://embeds.video/" + result.files[0].url });
                    showNotice("Finished uploading to FileDitch! URL copied to clipboard, dismissing notice in 10 seconds...", "Copy embeds.video URL", () => {
                        DiscordNative.clipboard.copy("https://embeds.video/" + result.files[0].url);
                        popNotice();
                    });
                    DiscordNative.clipboard.copy(result.files[0].url);
                    setTimeout(() => {
                        popNotice();
                    }, 10000);
                })
                .catch(error => {
                    sendBotMessage(SelectedChannelStore.getChannelId(), { content: "Error" + error });
                    console.error("Error:", error);
                });
        }
    }],
    start() {

    },
    stop() {

    }
});
