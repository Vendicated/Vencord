/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcEvents } from "@shared/IpcEvents";
import { BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions, shell } from "electron";

import { SETTINGS_DIR } from "./utils/constants";

let cachedUpdateAvailable = false;

ipcMain.on(IpcEvents.SET_TRAY_UPDATE_STATE, (_, available: boolean) => {
    cachedUpdateAvailable = available;
});

function getMainWindow(): BrowserWindow | undefined {
    return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
}

function sendToRenderer(event: IpcEvents): void {
    getMainWindow()?.webContents.send(event);
}

function findInsertIndex(template: MenuItemConstructorOptions[]): number {
    const openIndex = template.findIndex(item => {
        const label = item.label?.toLowerCase() ?? "";
        return label.includes("open") || label.includes("show");
    });
    return openIndex !== -1 ? openIndex + 1 : 0;
}

function isTrayMenu(template: MenuItemConstructorOptions[]): boolean {
    if (!template.length) return false;

    const hasOpenOrShow = template.some(item => {
        const label = item.label?.toLowerCase() ?? "";
        return label.includes("open") || label.includes("show");
    });

    const hasQuit = template.some(item =>
        item.label?.toLowerCase().includes("quit") || item.role === "quit"
    );

    const isNotAppMenu = !template.some(item =>
        item.label === "&File" || item.label === "File" ||
        item.label === "&Edit" || item.label === "Edit"
    );

    return hasOpenOrShow && hasQuit && isNotAppMenu;
}

function createVencordMenuItems(): MenuItemConstructorOptions[] {
    return [
        {
            label: "Vencord",
            submenu: [
                {
                    label: cachedUpdateAvailable ? "Update Vencord" : "Check for Updates",
                    click: () => sendToRenderer(IpcEvents.TRAY_CHECK_UPDATES)
                },
                {
                    label: "Repair Vencord",
                    click: () => sendToRenderer(IpcEvents.TRAY_REPAIR)
                },
                { type: "separator" },
                {
                    label: "Open Settings Folder",
                    click: () => shell.openPath(SETTINGS_DIR)
                }
            ]
        },
        { type: "separator" }
    ];
}

export function patchTrayMenu(): void {
    const originalBuildFromTemplate = Menu.buildFromTemplate;

    Menu.buildFromTemplate = function (template: MenuItemConstructorOptions[]) {
        if (isTrayMenu(template)) {
            const insertIndex = findInsertIndex(template);
            const vencordItems = createVencordMenuItems();
            template.splice(insertIndex, 0, ...vencordItems);
        }

        return originalBuildFromTemplate.call(this, template);
    };
}
