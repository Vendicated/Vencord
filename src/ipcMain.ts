import { app, BrowserWindow, ipcMain } from "electron";
import { fstat, watch } from "fs";
import { open, readFile } from "fs/promises";
import { join } from 'path';
import { IPC_GET_SETTINGS_DIR, IPC_GET_QUICK_CSS, IPC_QUICK_CSS_UPDATE } from './utils/ipcEvents';

const DATA_DIR = join(app.getPath("userData"), "..", "Vencord");
const SETTINGS_DIR = join(DATA_DIR, "settings");
const QUICKCSS_PATH = join(SETTINGS_DIR, "quickCss.css");

function readCss() {
    return readFile(QUICKCSS_PATH, "utf-8").catch(() => "");
}

ipcMain.handle(IPC_GET_SETTINGS_DIR, () => SETTINGS_DIR);
ipcMain.handle(IPC_GET_QUICK_CSS, () => readCss());

export function initIpc(mainWindow: BrowserWindow) {
    open(QUICKCSS_PATH, "a+").then(fd => {
        fd.close();
        watch(QUICKCSS_PATH, async () => {
            mainWindow.webContents.postMessage(IPC_QUICK_CSS_UPDATE, await readCss());
        });
    });
}
