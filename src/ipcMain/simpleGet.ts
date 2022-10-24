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
