import electron, { contextBridge, webFrame } from "electron";
import { readFileSync } from "fs";
import { join } from "path";
import VencordNative from "./VencordNative";
import { ipcRenderer } from 'electron';
import IpcEvents from "./utils/IpcEvents";

if (electron.desktopCapturer === void 0) {
    // Fix for desktopCapturer being main only in Electron 17+
    // Discord accesses this in discord_desktop_core (DiscordNative.desktopCapture.getDesktopCaptureSources)
    // and errors with cannot "read property getSources() of undefined"
    // see discord_desktop_core/app/discord_native/renderer/desktopCapture.js
    const electronPath = require.resolve("electron");
    delete require.cache[electronPath]!.exports;
    require.cache[electronPath]!.exports = {
        ...electron,
        desktopCapturer: {
            getSources: (opts) => ipcRenderer.invoke(IpcEvents.GET_DESKTOP_CAPTURE_SOURCES, opts)
        }
    };
}

contextBridge.exposeInMainWorld("VencordNative", VencordNative);

webFrame.executeJavaScript(readFileSync(join(__dirname, "renderer.js"), "utf-8"));

require(process.env.DISCORD_PRELOAD!);
