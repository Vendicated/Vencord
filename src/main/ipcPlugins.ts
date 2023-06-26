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

import { IpcEvents } from "@utils/IpcEvents";
import dgram from "dgram";
import { ipcMain } from "electron";

ipcMain.handle(IpcEvents.DGRAM_SEND, (_, data) => dgramSend(data));

export function dgramSend(data) {
    data.icon = Buffer.from(data.icon).toString("base64");
    data = JSON.stringify(data);
    const client = dgram.createSocket("udp4");
    client.send(data, 42069, "127.0.0.1", () => {
        console.log("Message sent to XSOverlay");
        client.close();
    });
}
