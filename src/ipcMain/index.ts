import { app, BrowserWindow, desktopCapturer, ipcMain, shell } from "electron";
import { mkdirSync, readFileSync, watch } from "fs";
import { open, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { debounce } from "../utils/debounce";
import IpcEvents from "../utils/IpcEvents";

import "./updater";

const DATA_DIR = join(app.getPath("userData"), "..", "Vencord");
const SETTINGS_DIR = join(DATA_DIR, "settings");
const QUICKCSS_PATH = join(SETTINGS_DIR, "quickCss.css");
const SETTINGS_FILE = join(SETTINGS_DIR, "settings.json");
const ALLOWED_PROTOCOLS = [
    "https:",
    "http:",
    "steam:",
    "spotify:"
];

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

// Fix for screensharing in Electron >= 17
ipcMain.handle(IpcEvents.GET_DESKTOP_CAPTURE_SOURCES, (_, opts) => desktopCapturer.getSources(opts));

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


ipcMain.handle(IpcEvents.GET_QUICK_CSS, () => readCss());

ipcMain.handle(IpcEvents.GET_SETTINGS_DIR, () => SETTINGS_DIR);
ipcMain.on(IpcEvents.GET_SETTINGS, e => e.returnValue = readSettings());

let settingsWriteQueue = Promise.resolve();
ipcMain.handle(IpcEvents.SET_SETTINGS, (_, s) => {
    settingsWriteQueue = settingsWriteQueue.then(() => writeFile(SETTINGS_FILE, s));
});


export function initIpc(mainWindow: BrowserWindow) {
    open(QUICKCSS_PATH, "a+").then(fd => {
        fd.close();
        watch(QUICKCSS_PATH, debounce(async () => {
            mainWindow.webContents.postMessage(IpcEvents.QUICK_CSS_UPDATE, await readCss());
        }, 50));
    });
}
