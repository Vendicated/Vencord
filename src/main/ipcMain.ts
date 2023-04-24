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

import "./updater";

import { debounce } from "@utils/debounce";
import IpcEvents from "@utils/IpcEvents";
import { Queue } from "@utils/Queue";
import { BrowserWindow, ipcMain, shell } from "electron";
import { mkdirSync, readFileSync, watch } from "fs";
import { open, readFile, writeFile } from "fs/promises";
import { join } from "path";

import monacoHtml from "~fileContent/../components/monacoWin.html;base64";

import { ALLOWED_PROTOCOLS, QUICKCSS_PATH, SETTINGS_DIR, SETTINGS_FILE } from "./utils/constants";

mkdirSync(SETTINGS_DIR, { recursive: true });

function readCss() {
    return readFile(QUICKCSS_PATH, "utf-8").catch(() => "");
}

export function readSettings() {
    try {
        return readFileSync(SETTINGS_FILE, "utf-8");
    } catch {
        return "{}";
    }
}

export function getSettings(): typeof import("@api/settings").Settings {
    try {
        return JSON.parse(readSettings());
    } catch {
        return {} as any;
    }
}

ipcMain.handle(IpcEvents.OPEN_QUICKCSS, () => shell.openPath(QUICKCSS_PATH));

ipcMain.handle(IpcEvents.OPEN_EXTERNAL, (_, url) => {
    try {
        var { protocol } = new URL(url);
    } catch {
        throw "Malformed URL";
    }
    if (!ALLOWED_PROTOCOLS.includes(protocol))
        throw "Disallowed protocol.";

    shell.openExternal(url);
});

const cssWriteQueue = new Queue();
const settingsWriteQueue = new Queue();

ipcMain.handle(IpcEvents.GET_QUICK_CSS, () => readCss());
ipcMain.handle(IpcEvents.SET_QUICK_CSS, (_, css) =>
    cssWriteQueue.push(() => writeFile(QUICKCSS_PATH, css))
);

ipcMain.handle(IpcEvents.GET_SETTINGS_DIR, () => SETTINGS_DIR);
ipcMain.on(IpcEvents.GET_SETTINGS, e => e.returnValue = readSettings());

ipcMain.handle(IpcEvents.SET_SETTINGS, (_, s) => {
    settingsWriteQueue.push(() => writeFile(SETTINGS_FILE, s));
});


export function initIpc(mainWindow: BrowserWindow) {
    open(QUICKCSS_PATH, "a+").then(fd => {
        fd.close();
        watch(QUICKCSS_PATH, { persistent: false }, debounce(async () => {
            mainWindow.webContents.postMessage(IpcEvents.QUICK_CSS_UPDATE, await readCss());
        }, 50));
    });
}

ipcMain.handle(IpcEvents.OPEN_MONACO_EDITOR, async () => {
    const win = new BrowserWindow({
        title: "Vencord QuickCSS Editor",
        autoHideMenuBar: true,
        darkTheme: true,
        webPreferences: {
            preload: join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });
    await win.loadURL(`data:text/html;base64,${monacoHtml}`);
});
