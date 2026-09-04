/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const backupFilename = "renamedGifsBackup.json";

interface BackupResult {
    success: boolean;
    error?: string;
    data?: string;
}

export function saveBackup(_event: IpcMainInvokeEvent, folderPath: string, data: string): BackupResult {
    try {
        if (!folderPath) return { success: false, error: "no backup folder set" };
        if (!existsSync(folderPath)) return { success: false, error: "that folder doesnt exist" };

        writeFileSync(join(folderPath, backupFilename), data, "utf-8");
        return { success: true };
    } catch (err) {
        console.error("RenameGifs native failed to save backup", err);
        return { success: false, error: String(err) };
    }
}

export function loadBackup(_event: IpcMainInvokeEvent, folderPath: string): BackupResult {
    try {
        if (!folderPath) return { success: false, error: "no backup folder set" };

        const filePath = join(folderPath, backupFilename);
        if (!existsSync(filePath)) return { success: false, error: "no backup file found in that folder" };

        return { success: true, data: readFileSync(filePath, "utf-8") };
    } catch (err) {
        console.error("RenameGifs native failed to load backup", err);
        return { success: false, error: String(err) };
    }
}
