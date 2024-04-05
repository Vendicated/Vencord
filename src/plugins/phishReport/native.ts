/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { IpcMainInvokeEvent } from "electron";
import { request, RequestOptions } from "https";

import { ErrorResponse, ResponseType, SuccessResponse } from "./types";

// Send a POST request to phish.report to report a phishing link
export function sendTakedownRequest(_: IpcMainInvokeEvent, url: string, apiKey: string) {
    return new Promise<SuccessResponse | ErrorResponse>((resolve, _) => {
        const data = {
            method: "POST",
            headers: {
                "authorization": "Bearer " + apiKey,
                "content-type": "application/json",
            },
        } satisfies RequestOptions;

        const message = request("https://phish.report/api/v0/cases", data, res => {
            const chunks: Uint8Array[] = [];

            res.on("data", chunk => {
                chunks.push(chunk);
            });

            res.on("end", () => {
                const body = JSON.parse(Buffer.concat(chunks).toString());
                if (res.statusCode === 200) {
                    resolve({
                        kind: ResponseType.Success,
                        id: body.id,
                    });
                } else {
                    resolve({
                        kind: ResponseType.Error,
                        message: body.message,
                    });
                }
            });
        });

        message.on("error", e => {
            resolve({
                kind: ResponseType.Error,
                message: e.message,
            });
        });

        message.write(JSON.stringify({
            url,
            ignore_duplicates: false,
        }));

        message.end();
    });
}
