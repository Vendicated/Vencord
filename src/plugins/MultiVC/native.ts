/*
 * MultiVC native — runs in Electron main process.
 *
 * IMPORTANT:
 * Extra Discord windows reuse the exact Session object of the
 * Discord window that invoked this IPC call. This keeps cookies,
 * localStorage, IndexedDB and other Chromium origin storage in the
 * same Electron session.
 */

import {
    BrowserWindow,
    session,
    type IpcMainInvokeEvent,
    type Session,
} from "electron";

const openWindows: BrowserWindow[] = [];

function getDiscordSession(event: IpcMainInvokeEvent): Session {
    // This is the most reliable way to obtain the already-authenticated
    // Discord session. Do NOT create a new/default session here.
    return event.sender.session;
}

export async function openDiscordTab(
    event: IpcMainInvokeEvent,
    url?: string,
) {
    const discordSession = getDiscordSession(event);

    /*
     * Make sure the session is ready before opening Discord.
     * We intentionally do not read or copy Discord's authentication token.
     */
    if (discordSession.isPersistent()) {
        await discordSession.flushStorageData();
    }

    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        autoHideMenuBar: true,
        title: "Discord Tab",
        backgroundColor: "#0b0c10",

        webPreferences: {
            /*
             * CRITICAL: pass the SAME Session object.
             *
             * Do not replace this with:
             *   partition: "..."
             * or:
             *   session: session.defaultSession
             *
             * Either can put the new Discord window in a different
             * storage container.
             */
            session: discordSession,

            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            spellcheck: false,
        },
    });

    openWindows.push(win);

    win.on("closed", () => {
        const i = openWindows.indexOf(win);
        if (i !== -1) openWindows.splice(i, 1);
    });

    /*
     * Load the same Discord origin used by the main client.
     * Because the BrowserWindow has the same Electron Session,
     * Discord sees the existing session state.
     */
    await win.loadURL(url || "https://discord.com/app");

    /*
     * Flush after navigation as well. This is useful when Chromium
     * has pending storage writes from the main Discord window.
     */
    if (!win.isDestroyed() && discordSession.isPersistent()) {
        await discordSession.flushStorageData();
    }

    return openWindows.filter(w => !w.isDestroyed()).length;
}

export function getTabCount(_: IpcMainInvokeEvent) {
    return openWindows.filter(w => !w.isDestroyed()).length;
}

export function closeAllTabs(_: IpcMainInvokeEvent) {
    for (const w of openWindows) {
        if (!w.isDestroyed()) w.close();
    }

    openWindows.length = 0;
}
