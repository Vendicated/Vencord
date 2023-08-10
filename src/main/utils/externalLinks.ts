/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type BrowserWindow, shell } from "electron";

export function makeLinksOpenExternally(win: BrowserWindow) {
    win.webContents.setWindowOpenHandler(({ url }) => {
        switch (url) {
            case "about:blank":
            case "https://discord.com/popout":
            case "https://ptb.discord.com/popout":
            case "https://canary.discord.com/popout":
                return { action: "allow" };
        }

        try {
            var { protocol } = new URL(url);
        } catch {
            return { action: "deny" };
        }

        switch (protocol) {
            case "http:":
            case "https:":
            case "mailto:":
            case "steam:":
            case "spotify:":
                shell.openExternal(url);
        }

        return { action: "deny" };
    });
}
