/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { saveFile } from "@utils/web";

const genericFilenames: string[] = [
    "image",
    "video",
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
    const regex = /^(.+)(\.[^.]+)$/;
    const result = regex.exec(filename);

    if (!result) {
        throw new Error(`Invalid filename: ${filename}`);
    }

    return {
        name: result[1],
        extension: result[2].substring(1),
    };
}

const settings = definePluginSettings({
    includeMilis: {
        name: "Include milis",
        description: "Include miliseconds in the timestamp",
        type: OptionType.BOOLEAN,
        default: true,
    }
});

export default definePlugin({
    name: "NoGenericFilenames",
    description: "Prevent discord downloads from overwriting files with generic names by adding a timestamp.",
    settings: settings,
    authors: [
        {
            id: 858410144349945867n,
            name: "Kirigamium",
        },
    ],

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
        var { includeMilis } = settings.store;

        const date = new Date();
        const hour = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");
        const milis = date.getMilliseconds().toString().padStart(4, "0");
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();

        return `${hour}:${minutes}:${seconds}:${includeMilis ? milis : ""} ${day}-${month}-${year}`;
    },

    async saveImage(url: string) {
        const data = await fetchImage(url);

        if (!data) return;

        const filenameData = getFilenameData(new URL(url).pathname.split("/").pop()!);
        var name: string = "";

        if (isGenericFilename(filenameData.name)) {
            name = `${filenameData.name} ${this.getCurrentDate()}.${filenameData.extension}`;
        } else {
            name = `${filenameData.name}.${filenameData.extension}`;
        }

        saveFile(new File([data], name, { type: data.type }));
    },
});
