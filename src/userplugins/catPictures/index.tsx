/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, ChoicesOption, findOption } from "@api/Commands";
import definePlugin from "@utils/types";
import { showToast, Toasts,UploadHandler } from "@webpack/common";

declare function require(name: string);
const tagListJson = require("./tags.json");
const draft_type = 0;

export default definePlugin({
    name: "CatPictures",
    description: "This plugin uses the Caatas API to get random cat pictures via a slash command.",
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
                    name: "font-size",
                    description: "Set the font size of the text that the cat says.",
                    type: ApplicationCommandOptionType.INTEGER,
                },
                {
                    name: "blur",
                    description: "Sets extra blur in the picture (only positive numbers, needs custom filter type to function)",
                    type: ApplicationCommandOptionType.INTEGER,
                },
                {
                    name: "red",
                    description: "Sets the red filter value the picture (needs custom filter type and other colors to function)",
                    type: ApplicationCommandOptionType.INTEGER,
                },
                {
                    name: "green",
                    description: "Sets the green filter value the picture (needs custom filter type and other colors to function)",
                    type: ApplicationCommandOptionType.INTEGER,
                },
                {
                    name: "blue",
                    description: "Sets the blue filter value the picture (needs custom filter type and other colors to function)",
                    type: ApplicationCommandOptionType.INTEGER,
                },
                {
                    name: "brightness",
                    description: "Sets the brightness filter value the picture (only positive numbers, needs custom filter type to function)",
                    type: ApplicationCommandOptionType.NUMBER,
                },
                {
                    name: "hue",
                    description: "Sets the hue rotation in degrees on the picture (needs custom filter type to function)",
                    type: ApplicationCommandOptionType.INTEGER,
                },
                {
                    name: "lightness",
                    description: "Sets the lightness added in the filter of the picture (needs custom filter type to function)",
                    type: ApplicationCommandOptionType.INTEGER,
                }
            ],
            execute: async (opts, ctx) => {
                const response = await getCatPicture(getURL(opts));
                if (response !== null) {
                    const file = new File([response], "cat.jpeg", { type: "image/jpeg" });
                    setTimeout(() => UploadHandler.promptToUpload([file], ctx.channel, draft_type), 10);
                }
            }
        },
    ]
});

function returnFloatWithParameter(number, parameter) {
    try {
        const float = parseFloat(number);
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
        return "";
    }
}

function getURL(opts): string {
    let says = findOption(opts, "say", "").toString();
    let tag = findOption(opts, "tag", "").toString();
    const fontSize = findOption(opts, "font-size", 40).toString();
    let filterType = findOption(opts, "filter", "").toString();
    let blur = findOption(opts, "blur", "").toString();
    let red = findOption(opts, "red", "").toString();
    let green = findOption(opts, "green", "").toString();
    let blue = findOption(opts, "blue", "").toString();
    let brightness = findOption(opts, "brightness", "").toString();
    let hueRotation = findOption(opts, "hue", "").toString();
    let saturationMultiplier = findOption(opts, "saturation-multiplier", "").toString();
    let lightnessAdded = findOption(opts, "lightness", "").toString();

    if (tag !== "") {
        tag = "/" + encodeURIComponent(tag.replace("/", ""));
    }
    if (says !== "") {
        says = "/says/" + encodeURIComponent(says.replace("/", ""));
    }
    if (filterType !== "") {
        filterType = "&filter=" + filterType;
        if (saturationMultiplier !== "") {
            saturationMultiplier = returnFloatWithParameter(saturationMultiplier, "&saturation=");
        }
        if (blur !== "") {
            blur = "&blur=" + blur;
        }
        if (red !== "" && blue !== "" && green !== "") {
            red = "&r=" + red;
            green = "&g=" + green;
            blue = "&b=" + blue;
        }
        else {
            red = "";
            blue = "";
            green = "";
        }
        if (brightness !== "") {
            brightness = returnFloatWithParameter(brightness, "&brightness=");
        }
        if (hueRotation !== "") {
            hueRotation = "&hue=" + hueRotation;
        }
        if (lightnessAdded !== "") {
            lightnessAdded = "&lightness=" + lightnessAdded;
        }
    }
    else {
        saturationMultiplier = "";
        blur = "";
        red = "";
        blue = "";
        green = "";
        brightness = "";
        hueRotation = "";
        lightnessAdded = "";
    }
    return "https://cataas.com/cat" + tag + says + "?font=Impact&fontSize=" + fontSize + "&fontColor=%23ffff&fontBackground=%230000" + filterType + "&position=center" + blur + red + green + blue + brightness + saturationMultiplier + hueRotation + lightnessAdded;
}
async function getCatPicture(url) {
    return await fetch(url, {
        method: "get",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(r => {
        const contenttype = r.headers.get("content-type");
        if (contenttype === "image/jpeg") {
            return r.blob();
        }
        else {
            showToast("Failed to get cat picture please try again.", Toasts.Type.FAILURE);
            return null;
        }
    });
}

function formatCommandTags() {
    const tags = new Array<ChoicesOption>();
    tagListJson.forEach(function (value) {
        tags.push({
            name: value,
            label: value,
            value: value
        });
    });
    return tags;
}
