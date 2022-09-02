import { app, BrowserWindow, ipcMain, shell } from "electron";
import { mkdirSync, readFileSync, watch } from "fs";
import { open, readFile, writeFile } from "fs/promises";
import { join } from 'path';
import { debounce } from "./utils/debounce";
import IpcEvents from './utils/IpcEvents';

const DATA_DIR = join(app.getPath("userData"), "..", "Vencord");
const SETTINGS_DIR = join(DATA_DIR, "settings");
const QUICKCSS_PATH = join(SETTINGS_DIR, "quickCss.css");
const SETTINGS_FILE = join(SETTINGS_DIR, "settings.json");

mkdirSync(SETTINGS_DIR, { recursive: true });

function readCss() {
    return readFile(QUICKCSS_PATH, "utf-8").catch(() => "");
}

function readSettings() {
    try {
        return readFileSync(SETTINGS_FILE, "utf-8");
    } catch {
        return "{}";
    }
}

ipcMain.handle(IpcEvents.GET_SETTINGS_DIR, () => SETTINGS_DIR);
ipcMain.handle(IpcEvents.GET_QUICK_CSS, () => readCss());
ipcMain.handle(IpcEvents.OPEN_PATH, (_, ...pathElements) => shell.openPath(join(...pathElements)));
ipcMain.handle(IpcEvents.OPEN_EXTERNAL, (_, url) => shell.openExternal(url));

// .on because we need Settings synchronously (ipcRenderer.sendSync)
ipcMain.on(IpcEvents.GET_SETTINGS, (e) => e.returnValue = readSettings());

// This is required because otherwise calling SET_SETTINGS in quick succession may lead to concurrent writes
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
