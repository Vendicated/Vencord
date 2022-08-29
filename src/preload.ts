import { contextBridge, webFrame } from "electron";
import { readFileSync } from "fs";
import { join } from "path";
import Vencord from "./Vencord";

contextBridge.exposeInMainWorld("VencordNative", {
    getSettings: () => "hi"
});

webFrame.executeJavaScript(readFileSync(join(__dirname, "renderer.js"), "utf-8"));

require(process.env.DISCORD_PRELOAD!);

window.onload = () => console.log("hi");