/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow } from "electron";
import * as http from "http";

let server: http.Server;

export function startServer(_, port: number = 1675) {
    const mainWindow = BrowserWindow.getAllWindows().filter(window => (new URL(window.webContents.getURL())).hostname === "discord.com")[0];

    server = http.createServer(async (req, res) => {
        const { searchParams, pathname } = new URL(req.url ?? "", "http://localhost");

        switch (pathname) {
            case "/":
                res.writeHead(200, { "Content-Type": "text/html" });
                res.write("<h1>Vencord HTTP Hooks Plugin</h1>");
                break;

            case "/start-vc":
                const userId = searchParams.get("userId");
                await mainWindow.webContents.executeJavaScript(`window.httphooks.startVC("${userId}")`);
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.write("Started VC");
                break;

            case "/end-vc":
                await mainWindow.webContents.executeJavaScript("window.httphooks.endVC()");
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.write("Ended VC");
                break;

            default:
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.write("404 Not Found");
                break;
        }

        res.end();
    });

    server.listen(port);
}

export function stopServer() {
    server.close();
}
