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

import IpcEvents from "@utils/IpcEvents";
import { ipcMain } from "electron";
import { writeFile } from "fs/promises";
import { join } from "path";

import { get } from "./simpleGet";

ipcMain.handleOnce(IpcEvents.DOWNLOAD_VENCORD_CSS, async () => {
    const buf = await get("https://github.com/Vendicated/Vencord/releases/download/devbuild/renderer.css");
    await writeFile(join(__dirname, "renderer.css"), buf);
    return buf.toString("utf-8");
});

