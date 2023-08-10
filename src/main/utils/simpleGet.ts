/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import https from "https";

export function get(url: string, options: https.RequestOptions = {}) {
    return new Promise<Buffer>((resolve, reject) => {
        https.get(url, options, res => {
            const { statusCode, statusMessage, headers } = res;
            if (statusCode! >= 400)
                return void reject(`${statusCode}: ${statusMessage} - ${url}`);
            if (statusCode! >= 300)
                return void resolve(get(headers.location!, options));

            const chunks = [] as Buffer[];
            res.on("error", reject);

            res.on("data", chunk => chunks.push(chunk));
            res.once("end", () => resolve(Buffer.concat(chunks)));
        });
    });
}
