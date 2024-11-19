/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fs from "fs/promises";
import path from "path";

import { getDefaultNativeDataDir, getDefaultNativeImageDir } from ".";
import { ensureDirectoryExists } from "./utils";

interface MLSettings {
    logsDir: string;
    imageCacheDir: string;
}
export async function getSettings(): Promise<MLSettings> {
    try {
        const settings = await fs.readFile(await getSettingsFilePath(), "utf8");
        return JSON.parse(settings);
    } catch (err) {
        // probably doesnt exist
        // time to create it
        const settings = {
            logsDir: await getDefaultNativeDataDir(),
            imageCacheDir: await getDefaultNativeImageDir(),
        };
        try {
            await saveSettings(settings);
        } catch (err) { }

        return settings;
    }
}

// dont expose this to renderer future me
export async function saveSettings(settings: MLSettings) {
    if (!settings) return;
    await fs.writeFile(await getSettingsFilePath(), JSON.stringify(settings, null, 4), "utf8");
}

async function getSettingsFilePath() {
    // mlSettings.json will always in that folder
    const MlDataDir = await getDefaultNativeDataDir();
    await ensureDirectoryExists(MlDataDir);
    const mlSettingsDir = path.join(MlDataDir, "mlSettings.json");

    return mlSettingsDir;
}

