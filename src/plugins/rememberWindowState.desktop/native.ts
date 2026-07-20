/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NativeSettings } from "@main/settings";
import { BrowserWindow, type IpcMainInvokeEvent, type Rectangle, screen } from "electron";

interface SavedWindowState {
    bounds: Rectangle;
    maximized: boolean;
}

let window: BrowserWindow | undefined;
let saveTimer: NodeJS.Timeout | undefined;

function isValidState(state: any): state is SavedWindowState {
    const { bounds } = state ?? {};
    return typeof state?.maximized === "boolean"
        && Number.isFinite(bounds?.x)
        && Number.isFinite(bounds?.y)
        && Number.isFinite(bounds?.width)
        && Number.isFinite(bounds?.height)
        && bounds.width > 0
        && bounds.height > 0;
}

function clampBounds(bounds: Rectangle): Rectangle {
    const { workArea } = screen.getDisplayMatching(bounds);
    const x = bounds.width > workArea.width
        ? workArea.x
        : Math.min(Math.max(bounds.x, workArea.x), workArea.x + workArea.width - bounds.width);
    const y = bounds.height > workArea.height
        ? workArea.y
        : Math.min(Math.max(bounds.y, workArea.y), workArea.y + workArea.height - bounds.height);

    return { ...bounds, x, y };
}

function saveWindowState() {
    if (!window || window.isDestroyed()) return;

    NativeSettings.store.plugins.RememberWindowState = {
        bounds: window.getNormalBounds(),
        maximized: window.isMaximized()
    };
}

function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWindowState, 300);
}

function flushSave() {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    saveWindowState();
}

function addListeners() {
    if (!window) return;

    window.on("move", scheduleSave);
    window.on("resize", scheduleSave);
    window.on("maximize", scheduleSave);
    window.on("unmaximize", scheduleSave);
    window.on("close", flushSave);
}

function removeListeners() {
    if (!window || window.isDestroyed()) return;

    window.off("move", scheduleSave);
    window.off("resize", scheduleSave);
    window.off("maximize", scheduleSave);
    window.off("unmaximize", scheduleSave);
    window.off("close", flushSave);
}

export function start(event: IpcMainInvokeEvent) {
    const newWindow = BrowserWindow.fromWebContents(event.sender);
    if (!newWindow) return;
    if (window && !window.isDestroyed()) return;

    window = newWindow;

    const savedState = NativeSettings.plain.plugins.RememberWindowState;
    if (isValidState(savedState)) {
        if (window.isMaximized()) window.unmaximize();
        window.setBounds(clampBounds(savedState.bounds));
        if (savedState.maximized) window.maximize();
    }

    addListeners();
}

export function stop(_: IpcMainInvokeEvent) {
    flushSave();
    removeListeners();
    window = undefined;
}
