/*
 * Vencord, a Discord client mod
 *
 */

import { BrowserWindow, app } from "electron";
import { join } from "path";

/**
 * Opens a new BrowserWindow displaying the same URL as the current Discord
 * instance and hides the sidebars to maximise the chat area.  This function
 * must be executed from the main process via the native helper bridge.
 *
 * @param _ctx Plugin context (unused)
 * @param url The URL of the conversation to open
 */
export async function openPopout(_ctx: unknown, url: string): Promise<void> {
    try {
        // Compute the preload script path used by Discord.  This replicates
        // Discord's own logic and ensures that the new window has the same
        // context isolation and preload behaviour as the main window.
        const appPath = app.getAppPath();
        let preloadPath: string | undefined;
        try {
            // Dynamically require because node resolution may differ between
            // environments.  common/paths exports a getModulePath() function.
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const commonPaths = require(join(appPath, "common/paths"));
            const modulePath: string = commonPaths.getModulePath();
            preloadPath = join(
                modulePath,
                "discord_desktop_core",
                "core.asar",
                "app",
                "mainScreenPreload.js",
            );
        } catch {
            // Fallback to the DISCORD_PRELOAD env var if present.
            preloadPath = process.env.DISCORD_PRELOAD;
        }
        // Attempt to reuse the same session as the main Discord window.  This
        // prevents Discord from asking to log in again or from detecting that
        // you're opening a link in a browser rather than the desktop app.
        let parentSession;
        try {
            const allWins = BrowserWindow.getAllWindows();
            const parentWin = allWins.find(w => !w.isDestroyed());
            // Use optional chaining in case the webContents or session are undefined.
            parentSession = parentWin?.webContents?.session;
        } catch {
            parentSession = undefined;
        }
        // Create the new window.  Use a standard size and show a frame.  Use the
        // same session as the main window if available.  Disable the sandbox to
        // allow context isolation; this is required for Electron >= 21.
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            title: "Discord",
            frame: true,
            webPreferences: {
                preload: preloadPath,
                session: parentSession,
                sandbox: false,
            },
        });
        // Remove the menu bar for a cleaner look.
        if (typeof win.setMenu === "function") {
            win.setMenu(null);
        }
        /*
         * CSS/JS injection script to hide Discord's sidebars in the pop‑out
         * window. Discord uses hashed class names that change frequently,
         * which makes targeting specific elements brittle. Instead of hard‑
         * coding the entire class name, we rely on stable selectors such as
         * `aria-label` attributes and substring matches (e.g. `[class*="sidebar"]`).
         * The script wraps the style injection in a function that waits for
         * the DOM to be ready before adding the style element.  We reuse an
         * existing `<style>` element if one is already present to avoid
         * injecting duplicates when the user navigates between channels.
         */
        const injectCSS =
            '(() => {' +
            'const applyStyles = () => {' +
            '  let style = document.getElementById("chat-popout-style");' +
            '  if (!style) {' +
            '    style = document.createElement("style");' +
            '    style.id = "chat-popout-style";' +
            '    document.head.appendChild(style);' +
            '  }' +
            '  style.innerHTML = ' +
            '    "nav[aria-label*=\\"Servers\\"], nav[class*=\\"guilds\\"] { display: none !important; }" + ' +
            '    "div[class*=\\"sidebar\\"], div[class*=\\"sidebarRegion\\"], div[class*=\\"membersWrap\\"] { display: none !important; }" + ' +
            '    "div[class*=\\"base\\"] { left: 0 !important; }" + ' +
            '    "div[class*=\\"content\\"], main[class*=\\"chatContent\\"], div[class*=\\"chatContent\\"] { margin-left: 0 !important; }";' +
            '};' +
            'if (document.readyState === "complete" || document.readyState === "interactive") {' +
            '  applyStyles();' +
            '} else {' +
            '  document.addEventListener("DOMContentLoaded", applyStyles);' +
            '}' +
            '})()';

        // Inject our styles when the DOM is ready for the first time and on
        // subsequent in‑page navigations within Discord.  `dom-ready` fires
        // when the document's DOM is fully parsed, while `did-navigate-in-page`
        // fires when the URL changes without a full page load (e.g. when
        // Discord navigates between channels).  We also listen for
        // `did-finish-load` as a fallback on initial load.
        const handleInject = () => {
            win.webContents.executeJavaScript(injectCSS).catch(() => void 0);
        };
        win.webContents.on('dom-ready', handleInject);
        win.webContents.on('did-navigate-in-page', handleInject);
        win.webContents.on('did-finish-load', handleInject);

        // Load the requested URL in the new window.  This preserves the channel
        // or DM that the user is viewing.
        await win.loadURL(url);
    } catch (err) {
        // Log any errors to the console for debugging.  Errors are swallowed
        // because the browser context handles reporting to the user.
        console.error("ChatPopouts native error:", err);
    }
}
