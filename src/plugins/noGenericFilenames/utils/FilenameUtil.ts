/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import plugin from "..";

export default class FilenameUtil {

    static readonly genericFilenamePatterns: string[] = [
        "image",
        "video",
        "unknown",
        "screenshot",
    ];

    static isGenericFilename(filename: string, patterns: string[]) {
        const regex = new RegExp(`^(?:${patterns.join("|")})$`, "i");
        return regex.test(filename);
    }

    static getFilenameData(filename: string): { name: string, extension: string; } {
        const regex = /^(.+?)(\.[^.]+)?$/;
        const result = regex.exec(filename);

        return {
            name: result?.[1] ?? "",
            extension: (result?.[2] ?? "")
        };
    }

    static resolveFile(url: string, data: Blob) {
        const fileDetails = this.getFilenameData(new URL(url).pathname.split("/").pop()!);
        const coindicences = plugin.coincidenceList.split("|");

        if (this.isGenericFilename(fileDetails.name, coindicences)) {
            fileDetails.name += ` ${plugin.getCurrentDate()}`;
        }

        return new File([data], fileDetails.name + fileDetails.extension, { type: data.type });

    }

}
