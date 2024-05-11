/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, ChoicesOption, findOption } from "@api/Commands";
import definePlugin from "@utils/types";
import { UploadHandler, showToast, Toasts } from "@webpack/common";
import { Devs } from "@utils/constants";

declare function require(name: string);
const tagListJson = require('./tags.json')
const draft_type = 0;

export default definePlugin({
    name: "CatPictures",
    description: "This plugin uses the Caatas API to get random cat pictures via a slash command.",
    authors: [Devs.Karfy],
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
                },
                {
                    name: "font-size",
                    description: "Set the font size of the text that the cat says.",
                    type: ApplicationCommandOptionType.INTEGER,
                },
                {
                    name: "filter",
                    description: "Choose which filter should be applied on the image.",
                    type: ApplicationCommandOptionType.STRING,
                    choices: [{
                        label: "mono",
                        value: "mono",
                        name: "mono"
                    },
                    {
                        label: "negate",
                        value: "negate",
                        name: "negate"
                    },
                    {
                        label: "custom",
                        value: "custom",
                        name: "custom (use custom options)"
                    }]
                },
                {
                    name: "saturation-multiplier",
                    description: "Set the saturation multiplier (only positive numbers, needs custom filter type to function)",
                    type: ApplicationCommandOptionType.NUMBER,

                },
                {
                    name: "blur",
                    description: "Sets extra blur in the picture (only positive numbers, needs custom filter type to function)",
                    type: ApplicationCommandOptionType.INTEGER,
                },
                {
                    name: "brightness",
                    description: "Sets the brightness multiplier (only positive numbers, needs custom filter type to function)",
                    type: ApplicationCommandOptionType.NUMBER,
                },
                {
                    name: "hue",
                    description: "Sets the hue rotation in degrees on the picture (needs custom filter type to function)",
                    type: ApplicationCommandOptionType.INTEGER,
                }
            ],
            execute: async (opts, ctx) => {
                let response = await getCatPicture(getURL(opts));
                if (response != null) {
                    setTimeout(() => UploadHandler.promptToUpload([response!], ctx.channel, draft_type), 10);
                }
            }
        },
    ]
});

function mergeFloatstringWithParameter(number: string, parameter: string): string {
    try {
        let float = parseFloat(number);
        if (float >= 0) {
            number = parameter + float;
        }
        else {
            showToast("Please input a brightness and saturation number bigger or equal 0!", Toasts.Type.FAILURE);
            number = "";
        }
        return number;
    }
    catch {
        showToast("Failed to get saturation multiplier or brightness!", Toasts.Type.FAILURE);
        return ""
    }
}

function getURL(opts: Argument[]): string {
    let says = findOption(opts, "say", "").toString();
    let tag = findOption(opts, "tag", "").toString();
    let fontSize = findOption(opts, "font-size", 40).toString();
    let filterType = findOption(opts, "filter", "").toString();
    let blur = findOption(opts, "blur", "").toString();
    let brightness = findOption(opts, "brightness", "").toString();
    let hueRotation = findOption(opts, "hue", "").toString();
    let saturationMultiplier = findOption(opts, "saturation-multiplier", "").toString();

    if (tag != "") {
        tag = "/" + encodeURIComponent(tag.replace("/", ""));
    }
    if (says != "") {
        says = "/says/" + encodeURIComponent(says.replace("/", ""));
    }
    if (filterType != "") {
        filterType = "&filter=" + filterType;
        if (saturationMultiplier != "") {
            saturationMultiplier = mergeFloatstringWithParameter(saturationMultiplier, "&saturation=");
        }
        if (blur != "") {
            blur = "&blur=" + blur;
        }
        if (brightness != "") {
            brightness = mergeFloatstringWithParameter(brightness, "&brightness=");
        }
        if (hueRotation != "") {
            hueRotation = "&hue=" + hueRotation;
        }
    }
    else {
        saturationMultiplier = "";
        blur = "";
        brightness = "";
        hueRotation = "";
    }
    return "https://cataas.com/cat" + tag + says + "?font=Impact&fontSize=" + fontSize + "&fontColor=%23ffff&fontBackground=%230000" + filterType + "&position=center" + blur + brightness + saturationMultiplier + hueRotation;
}
async function getCatPicture(url: string): Promise<File | null> {
    return await fetch(url, {
        method: "get",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(async r => {
        let contenttype = r.headers.get("content-type");
        if (contenttype == "image/jpeg") {
            return new File([await r.blob()], "cat.jpeg", { type: "image/jpeg" });
        }
        else if (contenttype == "image/png") {
            return new File([await r.blob()], "cat.png", { type: "image/png" });
        }
        else {
            showToast("Failed to get cat picture please try again.", Toasts.Type.FAILURE);
            return null;
        }
    })
}

function formatCommandTags(): Array<ChoicesOption> {
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
