/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { saveFile } from "@utils/web";
import moment from "moment";

const genericFilenames: string[] = [
    "image",
    "video",
    "unknow",
    "screenshot",
];

async function fetchImage(url: string) {
    const res = await fetch(url);
    if (res.status !== 200) return;

    return await res.blob();
}

function isGenericFilename(filename: string) {
    let rex = /^(bruh)\s*(?:\(([\d]+)\))?$/g;
    rex = new RegExp(rex.source.replace("bruh", genericFilenames.join("|")));
    return rex.test(filename);
}

function getFilenameData(filename: string): { name: string, extension: string; } {
    const regex = /^(.+?)(\.[^.]+)?$/;
    const result = regex.exec(filename);

    return {
        name: result?.[1] ?? "",
        extension: (result?.[2] ?? "")
    };
}

const settings = definePluginSettings({
    includeMillis: {
        name: "Include millis",
        description: "Include milliseconds in the timestamp",
        type: OptionType.BOOLEAN,
        default: true,
    },
    coincidenceList: {
        name: "Generic names list",
        description: "Comma separated list of generic file names, add your own posible coincidences here.",
        type: OptionType.STRING,
        default: genericFilenames.join(","),
    },
});

export default definePlugin({
    name: "NoGenericFilenames",
    description: "Prevent discord downloads from overwriting files with generic names by adding a timestamp.",
    settings: settings,
    authors: [Devs.Sphirye],

    patches: [
        {
            find: 'id:"save-image"',
            replacement: [
                {
                    match: /(?<=SAVE_IMAGE_MENU_ITEM,)action:/,
                    replace: "action:()=>$self.saveImage(arguments[0]),"
                },
            ]
        }
    ],

    getCurrentDate(): string {
        const { includeMillis } = settings.store;
        const m = moment();
        const date = m.format("YYYY-MM-DD");
        const time = m.format("H-MM-SS");
        const millis = includeMillis ? `.${m.milliseconds()}` : "";

        return `${date} ${time}${millis}`;
    },

    async saveImage(url: string) {
        const data = await fetchImage(url);

        if (!data) return;

        const filenameData = getFilenameData(new URL(url).pathname.split("/").pop()!);
        var name: string = "";

        if (isGenericFilename(filenameData.name)) {
            name = `${filenameData.name} ${this.getCurrentDate()}.${filenameData.extension}`;
        } else {
            name = `${filenameData.name}${filenameData.extension}`;
        }

        saveFile(new File([data], name, { type: data.type }));
    },
});
