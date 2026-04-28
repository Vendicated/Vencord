/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { DATA_DIR } from "@main/utils/constants";

const LOG_DIR_NAME = "StalkerLogs";

async function getLogDir(): Promise<string> {
    return path.join(DATA_DIR, LOG_DIR_NAME);
}

export async function writeStalkerLog(_event: Electron.IpcMainInvokeEvent, contents: string) {
    try {
        const logsDir = await getLogDir();
        await mkdir(logsDir, { recursive: true });

        // Use a daily rotating filename
        const fileName = `stalker-log-${new Date().toISOString().slice(0, 10)}.json`;
        const filePath = path.join(logsDir, fileName);

        await writeFile(filePath, contents, "utf8");
    } catch (e) {
        console.error("Stalker: Failed to write log", e);
    }
}

export async function readStalkerLog(_event: Electron.IpcMainInvokeEvent): Promise<string> {
    try {
        const logsDir = await getLogDir();
        await mkdir(logsDir, { recursive: true });

        const fileName = `stalker-log-${new Date().toISOString().slice(0, 10)}.json`;
        const filePath = path.join(logsDir, fileName);

        return await readFile(filePath, "utf8");
    } catch (e) {
        // If file doesn't exist (ENOENT), return empty array string
        return "[]";
    }
}

export async function getStalkerDataDir(_event: Electron.IpcMainInvokeEvent): Promise<string> {
    return await getLogDir();
}
