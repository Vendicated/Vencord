/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcEvents } from "@shared/IpcEvents";
import { sessionBus, Variant } from "dbus-next";
import { BrowserWindow } from "electron";

// Get the main window to send messages to renderer
function getMainWindow(): BrowserWindow | null {
    return (
        BrowserWindow.getAllWindows().find(
            w => w.title && w.title.includes("Discord"),
        ) || null
    );
}

(async function () {
    const bus = sessionBus();

    const obj = await bus.getProxyObject(
        "org.freedesktop.portal.Desktop",
        "/org/freedesktop/portal/desktop",
    );

    const globalShortcuts = obj.getInterface(
        "org.freedesktop.portal.GlobalShortcuts",
    );

    // HACK: not sure if "createSessionToken" the correct session handle token, but it seems to work
    const TOKEN = "createSessionToken";
    const session_request_handle: string = await globalShortcuts.CreateSession({
        session_handle_token: new Variant("s", TOKEN),
    });
    const SENDER = session_request_handle.match(/request\/([^/]+)\//)?.[1];

    const session_handle = `/org/freedesktop/portal/desktop/session/${SENDER}/${TOKEN}`;
    // TODO: get parent_window using the xdg_foreign protocol
    // (https://gitlab.freedesktop.org/wayland/wayland-protocols/-/blob/main/unstable/xdg-foreign/xdg-foreign-unstable-v2.xml)
    const parent_window = "";

    const bindShortcuts_request_handle = await globalShortcuts.BindShortcuts(
        session_handle,
        [
            ["toggle_mute", { description: new Variant("s", "Toggle mute") }],
            [
                "toggle_deafen",
                { description: new Variant("s", "Toggle deafen") },
            ],
        ],
        parent_window,
        { handle_token: new Variant("s", "bindShortcutsToken") },
    );

    globalShortcuts.on(
        "Activated",
        (session_handle: string, shortcut_id: string, timestamp, options) => {
            // Send message to renderer process
            const mainWindow = getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.postMessage(
                    IpcEvents.XDG_GLOBAL_KEYBIND_ACTIVATED,
                    shortcut_id,
                );
            }
        },
    );
})();
