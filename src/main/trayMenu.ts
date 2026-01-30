/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcEvents } from "@shared/IpcEvents";
import { gitHash } from "@shared/vencordUserAgent";
import { BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions, shell } from "electron";
import aboutHtml from "file://about.html?minify";

import { SETTINGS_DIR, THEMES_DIR } from "./utils/constants";

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

let aboutWindow: BrowserWindow | null = null;

function openAboutWindow() {
    if (aboutWindow) {
        aboutWindow.focus();
        return;
    }

    const height = 525;
    const width = 900;

    aboutWindow = new BrowserWindow({
        center: true,
        autoHideMenuBar: true,
        height,
        width
    });

    const aboutParams = aboutHtml.replace("{{VERSION}}", VERSION).replace("{{GIT_HASH}}", gitHash); // change to gitHashShort if/when its added
    const base64Html = Buffer.from(aboutParams).toString("base64");
    aboutWindow.loadURL(`data:text/html;base64,${base64Html}`);
    aboutWindow.on("closed", () => {
        aboutWindow = null;
    });
}

function createVencordMenuItems(): MenuItemConstructorOptions[] {
    return [
        {
            label: "Vencord",
            submenu: [
                {
                    label: "About Vencord",
                    click: () => openAboutWindow()
                },
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
                },
                {
                    label: "Open Themes Folder",
                    click: () => shell.openPath(THEMES_DIR)
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
