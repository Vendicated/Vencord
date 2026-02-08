/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Mavaki
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow, dialog, shell } from "electron";

const WINDOW_TITLE = "Bot Dashboard";

let win: BrowserWindow | null = null;
let authWin: BrowserWindow | null = null;
let backdropWin: BrowserWindow | null = null;

const HEADER_HEIGHT = 48;
let currentPartition = "persist:bot-webview";
let currentDashboardUrl = "https://bot.example.com/login";
let currentDashboardHost = "bot.example.com";
let allowedHosts = new Set<string>([currentDashboardHost]);

function makePartition(host: string) {
    const safe = host.toLowerCase().replace(/[^a-z0-9.-]/g, "_").slice(0, 64);
    return `persist:bot-webview_${safe}`;
}

function normalizeHttpUrl(url: string) {
    try {
        const u = new URL(url);
        if (u.protocol !== "http:" && u.protocol !== "https:") return null;
        return u.toString();
    } catch {
        return null;
    }
}

function setCurrentDashboardUrl(url: string) {
    const normalized = normalizeHttpUrl(url);
    if (!normalized) return false;

    currentDashboardUrl = normalized;
    try {
        currentDashboardHost = new URL(normalized).host.toLowerCase();
        allowedHosts = new Set([currentDashboardHost]);
        currentPartition = makePartition(currentDashboardHost);
    } catch { }
    return true;
}

function addAllowedHost(host: string | null | undefined) {
    if (!host) return;
    allowedHosts.add(host.toLowerCase());
}

function isDashboardUrl(url: string) {
    try {
        return new URL(url).host.toLowerCase() === currentDashboardHost;
    } catch {
        return false;
    }
}

function isAllowedUrl(url: string) {
    try {
        return allowedHosts.has(new URL(url).host.toLowerCase());
    } catch {
        return false;
    }
}

function isDiscordOauthUrl(url: string) {
    try {
        const u = new URL(url);
        const host = u.host.toLowerCase();
        if (!(host === "discord.com" || host === "ptb.discord.com" || host === "canary.discord.com")) return false;
        return u.pathname.startsWith("/oauth2/authorize");
    } catch {
        return false;
    }
}

function isRedirectTo(expectedRedirectUri: string | null, url: string) {
    if (!expectedRedirectUri) return false;
    try {
        const expected = new URL(expectedRedirectUri);
        const actual = new URL(url);
        return expected.origin === actual.origin && expected.pathname === actual.pathname;
    } catch {
        return false;
    }
}

function shouldInjectOverlay(url: string) {
    // Never inject into Discord pages (OAuth) to avoid breaking their UI.
    // Only inject into our dashboard pages.
    return isDashboardUrl(url);
}

function buildBackdropHtml() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="dark" />
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        background: rgba(0, 0, 0, 0.55);
      }
    </style>
  </head>
  <body></body>
</html>`;
}

function computeModalBounds(parent: BrowserWindow) {
    const b = parent.getBounds();

    const minW = 720, minH = 520;
    const maxW = 1200, maxH = 900;

    const width = Math.max(minW, Math.min(maxW, Math.floor(b.width * 0.85)));
    const height = Math.max(minH, Math.min(maxH, Math.floor(b.height * 0.85)));

    const x = Math.floor(b.x + (b.width - width) / 2);
    const y = Math.floor(b.y + (b.height - height) / 2);

    return { x, y, width, height };
}

async function ensureBackdrop(parent: BrowserWindow) {
    if (backdropWin && !backdropWin.isDestroyed()) return backdropWin;

    backdropWin = new BrowserWindow({
        show: false,
        frame: false,
        transparent: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        // Must be focusable to receive click/focus events
        focusable: true,
        parent,
        modal: false,
        hasShadow: false,
        backgroundColor: "#00000000",
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        }
    });

    await backdropWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildBackdropHtml())}`);
    // Keep it behind the modal window but above Discord.
    backdropWin.setAlwaysOnTop(true, "modal-panel");

    // Click outside -> backdrop gets focused -> close everything (Discord-like)
    backdropWin.on("focus", () => {
        try { authWin?.close(); } catch { }
        try { win?.close(); } catch { }
        try { backdropWin?.close(); } catch { }
    });

    backdropWin.on("closed", () => {
        backdropWin = null;
    });

    return backdropWin;
}

function getOverlayScript() {
    const bg = "#313338";
    const border = "rgba(255,255,255,0.06)";
    const text = "rgba(255,255,255,0.92)";

    // Inject a Discord-like header overlay into the remote page.
    return `(() => {
  const HEADER_ID = "vc-guikonaut-dashboard-header";
  const STYLE_ID = "vc-guikonaut-dashboard-style";
  if (document.getElementById(HEADER_ID)) return;

  // Hide scrollbars but keep scrolling enabled
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = \`
      html, body {
        scrollbar-width: none !important; /* Firefox */
        -ms-overflow-style: none !important; /* old Edge */
      }
      ::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
      }
      ::-webkit-scrollbar-thumb {
        background: transparent !important;
      }
    \`;
    document.documentElement.appendChild(style);
  }

  const header = document.createElement("div");
  header.id = HEADER_ID;
  header.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "right:0",
    "height:${HEADER_HEIGHT}px",
    "display:flex",
    "align-items:center",
    "padding:0 12px",
    "box-sizing:border-box",
    "background:${bg}",
    "border-bottom:1px solid ${border}",
    "color:${text}",
    "font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif",
    "z-index:2147483647",
    "-webkit-app-region:drag",
    "user-select:none"
  ].join(";");

  const title = document.createElement("div");
  title.textContent = ${JSON.stringify(WINDOW_TITLE)};
  title.style.cssText = "font-size:14px;font-weight:600;";

  const spacer = document.createElement("div");
  spacer.style.cssText = "flex:1;";

  const close = document.createElement("button");
  close.textContent = "×";
  close.setAttribute("aria-label", "Fermer");
  close.title = "Fermer";
  close.style.cssText = [
    "-webkit-app-region:no-drag",
    "appearance:none",
    "border:none",
    "background:transparent",
    "color:${text}",
    "width:32px",
    "height:32px",
    "border-radius:6px",
    "cursor:pointer",
    "font-size:18px",
    "line-height:32px"
  ].join(";");
  close.addEventListener("mouseenter", () => close.style.background = "rgba(255,255,255,0.08)");
  close.addEventListener("mouseleave", () => close.style.background = "transparent");
  close.addEventListener("click", () => window.close());

  header.appendChild(title);
  header.appendChild(spacer);
  header.appendChild(close);

  document.documentElement.appendChild(header);

  // Push page content below the overlay.
  const pad = "${HEADER_HEIGHT}px";
  const html = document.documentElement;
  const body = document.body;
  if (html) html.style.scrollPaddingTop = pad;
  if (body) {
    const prev = body.style.paddingTop || "";
    if (!prev) body.style.paddingTop = pad;
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.close();
  });
})();`;
}

function setUpExternalLinks(wc: Electron.WebContents) {
    wc.setWindowOpenHandler(({ url }) => {
        // Some auth flows open about:blank and then navigate it.
        switch (url) {
            case "about:blank":
            case "https://discord.com/popout":
            case "https://ptb.discord.com/popout":
            case "https://canary.discord.com/popout":
                return { action: "allow" };
        }

        // Allow dashboard site and Discord OAuth popups inside the app.
        if (isAllowedUrl(url) || isDiscordOauthUrl(url)) {
            return { action: "allow" };
        }

        try {
            const { protocol } = new URL(url);
            if (protocol === "http:" || protocol === "https:" || protocol === "mailto:") {
                shell.openExternal(url);
            }
        } catch { }
        return { action: "deny" };
    });
}

async function openOauthPopup(oauthUrl: string) {
    if (!win || win.isDestroyed()) return;

    if (authWin && !authWin.isDestroyed()) {
        authWin.focus();
        await authWin.loadURL(oauthUrl);
        return;
    }

    let redirectUri: string | null = null;
    try {
        const u = new URL(oauthUrl);
        redirectUri = u.searchParams.get("redirect_uri");
        if (redirectUri) {
            const normalized = normalizeHttpUrl(redirectUri);
            redirectUri = normalized;
            addAllowedHost(normalized ? new URL(normalized).host : null);
        }
    } catch { }

    authWin = new BrowserWindow({
        title: "Discord OAuth",
        width: 520,
        height: 720,
        parent: win,
        modal: true,
        autoHideMenuBar: true,
        frame: false,
        backgroundColor: "#313338",
        resizable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            partition: currentPartition,
        }
    });

    setUpExternalLinks(authWin.webContents);

    const interceptExternalProtocols = (e: Electron.Event, url: string) => {
        try {
            const u = new URL(url);
            if (u.protocol === "http:" || u.protocol === "https:") return;
            e.preventDefault();
            shell.openExternal(url);
        } catch { }
    };

    const injectOverlay = async () => {
        if (!authWin || authWin.isDestroyed()) return;
        try {
            const url = authWin.webContents.getURL();
            if (!shouldInjectOverlay(url)) return;
            await authWin.webContents.executeJavaScript(getOverlayScript(), true);
        } catch { }
    };

    authWin.webContents.on("dom-ready", () => void injectOverlay());
    authWin.webContents.on("did-navigate", () => void injectOverlay());
    authWin.webContents.on("did-navigate-in-page", () => void injectOverlay());
    authWin.webContents.on("will-navigate", interceptExternalProtocols);
    authWin.webContents.on("will-redirect", interceptExternalProtocols);

    authWin.webContents.on("will-redirect", async (e, url) => {
        if (!authWin || authWin.isDestroyed()) return;
        if (!isRedirectTo(redirectUri, url)) return;

        // Complete the auth in the main window, then close the popup.
        e.preventDefault();
        try {
            await win?.loadURL(url);
        } finally {
            authWin.close();
        }
    });

    // Some Discord OAuth flows do full navigations instead of redirects
    authWin.webContents.on("will-navigate", async (e, url) => {
        if (!authWin || authWin.isDestroyed()) return;
        if (!isRedirectTo(redirectUri, url)) return;

        e.preventDefault();
        try {
            await win?.loadURL(url);
        } finally {
            authWin.close();
        }
    });

    authWin.webContents.on("did-fail-load", async (_e, code, desc, validatedURL, isMainFrame) => {
        if (!isMainFrame || !authWin || authWin.isDestroyed()) return;

        await dialog.showMessageBox(authWin, {
            type: "error",
            title: "Connexion Discord",
            message: "Impossible de charger la page de connexion Discord.",
            detail: `${desc} (${code})\n\n${validatedURL || oauthUrl}`,
        });
    });

    // If we never reach dom-ready, surface something actionable.
    const domReadyTimeout = setTimeout(async () => {
        if (!authWin || authWin.isDestroyed()) return;
        const current = authWin.webContents.getURL();
        await dialog.showMessageBox(authWin, {
            type: "warning",
            title: "Discord OAuth",
            message: "The OAuth page does not display (black screen).",
            detail: `Current URL: ${current || "(empty)"}\n\nTip: this problem is often caused by a preload that breaks external pages. It has been disabled for this window.`,
        });
    }, 6000);
    authWin.webContents.once("dom-ready", () => clearTimeout(domReadyTimeout));

    authWin.on("closed", () => {
        authWin = null;
    });

    // Discord sometimes behaves weirdly in Electron; use a more standard UA for OAuth
    try {
        authWin.webContents.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
    } catch { }

    try {
        await authWin.loadURL(oauthUrl);
    } catch (e) {
        if (!authWin || authWin.isDestroyed()) return;
        await dialog.showMessageBox(authWin, {
            type: "error",
            title: "Discord OAuth",
            message: "Failed to load OAuth.",
            detail: String(e),
        });
        return;
    }
    await injectOverlay();

    authWin.center();
    authWin.show();
}

export function setDashboardUrl(_: Electron.IpcMainInvokeEvent, url: string) {
    return setCurrentDashboardUrl(url);
}

export async function openDashboardWindow(_: Electron.IpcMainInvokeEvent) {
    if (win && !win.isDestroyed()) {
        win.focus();
        return;
    }

    const existing = BrowserWindow.getAllWindows().find(w => w.title === WINDOW_TITLE);
    if (existing && !existing.isDestroyed()) {
        win = existing;
        win.focus();
        return;
    }

    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows().find(w => !w.isDestroyed()) ?? undefined;

    if (parent && !parent.isDestroyed()) {
        const bd = await ensureBackdrop(parent);
        bd.setBounds(parent.getBounds());
        bd.showInactive();
    }

    win = new BrowserWindow({
        title: WINDOW_TITLE,
        width: 1100,
        height: 800,
        autoHideMenuBar: true,
        parent,
        modal: parent != null,
        frame: false,
        backgroundColor: "#313338",
        hasShadow: true,
        resizable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        show: false,
        skipTaskbar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            partition: currentPartition,
        }
    });

    setUpExternalLinks(win.webContents);

    win.on("closed", () => {
        win = null;
        try {
            backdropWin?.close();
        } catch { }
    });

    const injectOverlay = async () => {
        if (!win || win.isDestroyed()) return;
        try {
            const url = win.webContents.getURL();
            if (!shouldInjectOverlay(url)) return;
            await win.webContents.executeJavaScript(getOverlayScript(), true);
        } catch { }
    };

    // If the dashboard tries to navigate to Discord OAuth in-place, open it as a proper popup instead.
    win.webContents.on("will-navigate", (e, url) => {
        if (!isDiscordOauthUrl(url)) return;
        e.preventDefault();
        void openOauthPopup(url);
    });

    // Many logins first 302 redirect to Discord OAuth; catch that too.
    win.webContents.on("will-redirect", (e, url) => {
        if (!isDiscordOauthUrl(url)) return;
        e.preventDefault();
        void openOauthPopup(url);
    });

    // If we somehow already navigated to the OAuth page, recover by moving it into the auth window.
    win.webContents.on("did-navigate", (_e, url) => {
        if (!isDiscordOauthUrl(url)) return;
        void openOauthPopup(url);
        // Try to keep the main window on the dashboard (avoids black screen state)
        void win?.loadURL(currentDashboardUrl);
    });

    win.webContents.on("dom-ready", () => void injectOverlay());
    win.webContents.on("did-navigate", () => void injectOverlay());
    win.webContents.on("did-navigate-in-page", () => void injectOverlay());

    win.webContents.on("did-fail-load", async (_e, code, desc, validatedURL, isMainFrame) => {
        if (!isMainFrame || !win || win.isDestroyed()) return;

        await dialog.showMessageBox(win, {
            type: "error",
            title: WINDOW_TITLE,
            message: "Failed to load the dashboard in the embedded window.",
            detail: `${desc} (${code})\n\n${validatedURL || currentDashboardUrl}`,
        });
    });

    await win.loadURL(currentDashboardUrl);
    await injectOverlay();

    if (parent && !parent.isDestroyed()) {
        win.setBounds(computeModalBounds(parent));

        const syncToParent = () => {
            if (!parent || parent.isDestroyed()) return;
            try {
                backdropWin?.setBounds(parent.getBounds());
                if (win && !win.isDestroyed()) win.setBounds(computeModalBounds(parent), false);
            } catch { }
        };

        parent.on("move", syncToParent);
        parent.on("resize", syncToParent);
        win.on("closed", () => {
            try {
                parent.off("move", syncToParent);
                parent.off("resize", syncToParent);
            } catch { }
        });
    } else {
        win.center();
    }

    // Must be above backdrop (modal-panel)
    win.setAlwaysOnTop(true, "screen-saver");
    win.show();
    win.moveTop();
}

