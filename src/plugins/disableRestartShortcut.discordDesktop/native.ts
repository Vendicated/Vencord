/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { app, IpcMainInvokeEvent, WebContents } from "electron";

import { parseRestartShortcut } from "./restartShortcut";
const capturing = new WeakSet<WebContents>();
export function setCapturing(event: IpcMainInvokeEvent, active: boolean) {
    if (typeof active !== "boolean") throw new TypeError("active must be a boolean");
    event.sender.setIgnoreMenuShortcuts(active);
    if (active) capturing.add(event.sender);
    else capturing.delete(event.sender);
}
app.on("browser-window-created", (_, win) => {
    win.webContents.on("before-input-event", (event, input) => {
        const settings = RendererSettings.store.plugins?.DisableRestartShortcut;
        if (capturing.has(win.webContents) || !settings?.enabled
            || input.meta || input.isComposing) return;
        if (input.code === "KeyR" && input.control && !input.alt && !input.shift) {
            if (settings.blockCtrlR !== false) event.preventDefault();
            return;
        }
        if (settings.blockCtrlR !== false) return;
        const restartShortcut = parseRestartShortcut(settings.restartShortcut ?? "Ctrl+Shift+R");
        if (!restartShortcut || input.code !== restartShortcut.code || input.control !== restartShortcut.ctrl
            || input.alt !== restartShortcut.alt || input.shift !== restartShortcut.shift) return;
        event.preventDefault();
        if (input.type === "keyDown" && !input.isAutoRepeat) win.webContents.reload();
    });
});
