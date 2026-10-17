/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PlainSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { chooseFile, saveFile } from "@utils/web";
import { moment, showToast } from "@webpack/common";

import { DataStore } from "..";

type BackupType = "all" | "plugins" | "css" | "datastore";

const toastSuccess = () =>
    showToast({ text: "Settings successfully imported. Restart to apply changes!", variant: "success" });

const toastFailure = (err: any) =>
    showToast({ text: `Failed to import settings: ${String(err)}`, variant: "critical" });

const logger = new Logger("SettingsSync:Offline", "#39b7e0");

function deepMerge<T extends object>(target: T, source: T): T {
    for (const key in source) {
        const sourceVal = source[key];

        if (sourceVal !== null && typeof sourceVal === "object" && !Array.isArray(sourceVal)) {
            if (target[key] === null || target[key] === undefined || typeof target[key] !== "object" || Array.isArray(target[key])) {
                target[key] = {} as any;
            }
            deepMerge(target[key] as object, sourceVal as object);
        } else {
            target[key] = sourceVal;
        }
    }
    return target;
}

function isSafeObject(obj: any) {
    if (obj == null || typeof obj !== "object") return true;

    for (const key in obj) {
        if (["__proto__", "constructor", "prototype"].includes(key)) {
            return false;
        }
        if (!isSafeObject(obj[key])) {
            return false;
        }
    }

    return true;
}

export async function importSettings(data: string, type: BackupType = "all", cloud = false) {
    try {
        var parsed = JSON.parse(data);
    } catch (err) {
        console.log(data);
        throw new Error("Failed to parse JSON: " + String(err));
    }

    if (!isSafeObject(parsed))
        throw new Error("Unsafe Settings");

    switch (type) {
        case "all": {
            if (!cloud && (!("settings" in parsed)))
                throw new Error("Invalid Settings. Plugin settings is required for this import try a different one.");

            if (parsed.settings) {
                deepMerge(PlainSettings, parsed.settings);
                await VencordNative.settings.set(PlainSettings);
            }
            if (parsed.quickCss) await VencordNative.quickCss.set(parsed.quickCss);
            if (parsed.dataStore) await DataStore.setMany(parsed.dataStore);
            break;
        }
        case "plugins": {
            if (!parsed.settings) throw new Error("Plugin settings missing");

            deepMerge(PlainSettings, parsed.settings);
            await VencordNative.settings.set(PlainSettings);
            break;
        }
        case "css": {
            if (!parsed.quickCss) throw new Error("CSS missing");

            await VencordNative.quickCss.set(parsed.quickCss);
            break;
        }
        case "datastore": {
            if (!parsed.dataStore) throw new Error("DataStore data missing");

            await DataStore.setMany(parsed.dataStore);
            break;
        }
    }
}

export async function exportSettings({ syncDataStore = true, type = "all", minify }: { syncDataStore?: boolean; type?: BackupType; minify?: boolean; }) {
    const settings = VencordNative.settings.get();
    const quickCss = await VencordNative.quickCss.get();
    let dataStore: any;

    if (syncDataStore) {
        try {
            dataStore = (await Promise.all((await DataStore.keys<IDBValidKey>()).map(async (key): Promise<[IDBValidKey, unknown] | undefined> => { try { return [key, await DataStore.get<unknown>(key)]; } catch (error) { logger.warn(`Skipping unreadable DataStore record ${String(key)}:`, error); return undefined; } }))).filter((entry): entry is [IDBValidKey, unknown] => entry !== undefined);
        } catch (err) {
            logger.error("Failed to read DataStore entries:", err);

            if (type === "all") {
                logger.warn("Skipping DataStore in backup due to size. Export DataStore separately if needed.");
                showToast({ text: "DataStore too large - exported without it. Use 'Export DataStore' separately if needed." });
                dataStore = undefined;
            } else if (type === "datastore") {
                throw new Error("DataStore is too large to export. Please clear some plugin data and try again.");
            }
        }
    }

    switch (type) {
        case "all": {
            return JSON.stringify({ settings, quickCss, ...(dataStore && { dataStore }) }, null, minify ? undefined : 4);
        }
        case "plugins": {
            return JSON.stringify({ settings }, null, minify ? undefined : 4);
        }
        case "css": {
            return JSON.stringify({ quickCss }, null, minify ? undefined : 4);
        }
        case "datastore": {
            return JSON.stringify({ dataStore }, null, minify ? undefined : 4);
        }
    }
}

export async function downloadSettingsBackup(type: BackupType = "all", { minify }: { minify?: boolean; } = {}) {
    try {
        const syncDataStore = type === "all" || type === "datastore";
        const backup = await exportSettings({ minify, type, syncDataStore });
        const filename = `equicord-${type}-backup-${moment().format("YYYY-MM-DD")}.json`;
        const data = new TextEncoder().encode(backup);

        if (IS_DISCORD_DESKTOP) {
            DiscordNative.fileManager.saveWithDialog(data, filename);
        } else {
            saveFile(new File([data], filename, { type: "application/json" }));
        }
    } catch (err) {
        logger.error("Failed to export settings:", err);
        showToast({ text: "Failed to export settings, check console", variant: "critical" });
        throw err;
    }
}

export async function uploadSettingsBackup(type: BackupType = "all", showToast = true): Promise<void> {
    if (IS_DISCORD_DESKTOP) {
        const [file] = await DiscordNative.fileManager.openFiles({
            filters: [
                { name: "Equicord Settings Backup", extensions: ["json"] },
                { name: "all", extensions: ["*"] }
            ]
        });

        if (file) {
            try {
                await importSettings(new TextDecoder().decode(file.data), type);
                if (showToast) toastSuccess();
            } catch (err) {
                logger.error(err);
                if (showToast) toastFailure(err);
            }
        }
    } else {
        const file = await chooseFile("application/json");
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await importSettings(reader.result as string, type);
                if (showToast) toastSuccess();
            } catch (err) {
                logger.error(err);
                if (showToast) toastFailure(err);
            }
        };
        reader.readAsText(file);
    }
}
