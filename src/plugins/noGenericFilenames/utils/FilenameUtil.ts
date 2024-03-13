/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export default class FilenameUtil {

    static readonly genericFilenamePatterns: string[] = [
        "image",
        "video",
        "unknown",
        "screenshot",
    ];

    static isGenericFilename(filename: string) {
        const regex = new RegExp(`^(?:${this.genericFilenamePatterns.join("|")})$`, "i");
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

}
