/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { SettingsStore } from "@shared/SettingsStore";
import { IpcEvents } from "@utils/IpcEvents";
import { ipcMain } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "fs";

import { SETTINGS_DIR, SETTINGS_FILE } from "./utils/constants";

mkdirSync(SETTINGS_DIR, { recursive: true });

function readSettings(): Partial<Settings> {
    try {
        return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
    } catch (err) {
        console.error("Failed to read renderer settings", err);
        return {};
    }
}

export const RendererSettings = new SettingsStore(readSettings());

RendererSettings.addGlobalChangeListener(() => {
    writeFileSync(SETTINGS_FILE, JSON.stringify(RendererSettings.plain, null, 4));
});

ipcMain.handle(IpcEvents.GET_SETTINGS_DIR, () => SETTINGS_DIR);
ipcMain.on(IpcEvents.GET_SETTINGS, e => e.returnValue = RendererSettings.plain);

ipcMain.handle(IpcEvents.SET_SETTINGS, (_, data: Settings, pathToNotify?: string) => {
    RendererSettings.setData(data, pathToNotify);
});
