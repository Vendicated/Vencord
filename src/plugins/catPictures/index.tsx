/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { ApplicationCommandInputType, ApplicationCommandOptionType, ChoicesOption, findOption } from "@api/Commands";
import definePlugin from "@utils/types";
import { UploadHandler } from "@webpack/common";

declare function require(name: string);
const tagListJson = require('./tags.json')
const draft_type = 0;

export default definePlugin({
    name: "CatPicturesCommand",
    description: "This plugin uses the Caatas API to send random cat pictures.",
    authors: [
        {
            id: 353145839864250368n,
            name: "Karfy",
        },
    ],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "cat",
            description: "Get a random cat picture to send.",
            options: [
                {
                    name: "say",
                    description: "Text that the cat should say.",
                    type: ApplicationCommandOptionType.STRING
                },
                {
                    name: "tag",
                    description: "Filter for a specific category of cats.",
                    type: ApplicationCommandOptionType.STRING,
                    choices: formatCommandTags()
                }
            ],
            execute: async (opts, ctx) => {
                let catSays = findOption(opts, "say", "");
                let catTag = findOption(opts, "tag", "");

                let response = await getCatPicture(catSays, catTag);
                let file = new File([response], "cat.jpeg", { type: "image/jpeg" })

                setTimeout(() => UploadHandler.promptToUpload([file], ctx.channel, draft_type), 10);
            }
        },
    ]
});

async function getCatPicture(catSays, catTag) {
    if (catTag != "") {
        catTag = catTag.replace("/", "")
        catTag = "/" + encodeURIComponent(catTag);
    }
    if (catSays != "") {
        catSays = catSays.replace("/", "")
        catSays = "/says/" + encodeURIComponent(catSays);
    }
    let url = "https://cataas.com/cat" + catTag + catSays + "?font=Impact&fontSize=40&fontColor=%23FFFF&fontBackground=none&position=center";
    console.info(url);
    return await fetch(url, {
        method: "get",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(r => r.blob())
}

function formatCommandTags() {
    let tags = new Array<ChoicesOption>();
    tagListJson.forEach(function (value) {
        tags.push({
            name: value,
            label: value,
            value: value
        })
    });
    return tags;
}
