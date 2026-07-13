import { IpcMainInvokeEvent } from "electron";
import fs from "fs";
import path from "path";

const logFile = "C:\\Users\\Yashjit 2\\Workspace\\Vencord\\websocket_error.log";

export function writeLog(e: IpcMainInvokeEvent, text: string) {
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFile, `[${timestamp}] ${text}\n`);
    } catch (err) {
        console.error("Failed to write to native log file:", err);
    }
}
