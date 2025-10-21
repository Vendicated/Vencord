/*
 * Vencord, a Discord client mod
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import definePlugin, { PluginNative } from "@utils/types";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Menu } from "@webpack/common";
import { OpenExternalIcon } from "@components/Icons";

// Bound native pop‑out helper.  When the plugin starts, we store a function
// here that calls the native helper with the correct plugin context.  The
// context menu callbacks can then call this function directly to ensure
// the session is preserved.  When the plugin stops, this is cleared.
let openPopoutFunc: ((url: string) => Promise<void>) | undefined;

/*
 * ChatPopouts
 *
 * This plugin adds a small icon to the right-hand toolbar of every text channel or
 * direct message. Clicking the icon opens the current conversation in a separate
 * Electron `BrowserWindow`. The pop‑out window loads the same URL as the
 * original Discord instance and then injects a little bit of CSS to hide the
 * server and channel sidebars so the chat can make use of the full width of the
 * window.  The pop‑out behaves much like the chat pop‑out in Microsoft Teams
 * and allows you to keep multiple chats open side‑by‑side.
 */

// Factory for creating context menu patches.  We define this helper
// outside of the plugin object so that the patch functions are available
// during plugin registration (before `start()` runs).  Each generated patch
// computes a URL for the clicked channel and invokes the native helper to
// open a new window.  It also decides where within the existing menu
// groups to insert the new item based on the context menu identifier.
const createContextMenuPatch = (navId: string): NavContextMenuPatchCallback => {
    return (children, props) => {
        const { channel } = props || {};
        if (!channel) return;
        // Use the current origin rather than hard‑coding discord.com.  Discord
        // desktop can run on different subdomains (e.g. canary.discord.com,
        // ptb.discord.com) depending on the release channel.  Constructing
        // the URL from location.origin ensures we open a pop‑out on the same
        // domain and therefore preserve cookies and auth tokens.  Without
        // this, the new window may prompt for login when using the context
        // menu despite being authenticated in the main window.
        const guildId = (channel.guild_id ?? "@me") as string;
        const origin = window.location.origin;
        const url = `${origin}/channels/${guildId}/${channel.id}`;
        const item = (
            <Menu.MenuItem
                id="vc-chatpopouts-open"
                label="Pop out chat"
                icon={OpenExternalIcon}
                action={() => {
                    // Use the bound pop‑out helper if available.  This function is
                    // assigned in the plugin's start() method and ensures that
                    // the native helper receives the plugin context correctly.
                    if (openPopoutFunc) {
                        openPopoutFunc(url).catch(() => void 0);
                    }
                }}
            />
        );
        switch (navId) {
            case "channel-context":
            case "thread-context": {
                const container = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
                container.push(item);
                break;
            }
            case "gdm-context": {
                const container = findGroupChildrenByChildId("leave-channel", children) ?? children;
                container.unshift(item);
                break;
            }
            case "user-context": {
                const container = findGroupChildrenByChildId("close-dm", children);
                if (container) {
                    const idx = container.findIndex(c => c?.props?.id === "close-dm");
                    if (idx !== -1) {
                        container.splice(idx, 0, item);
                    } else {
                        container.push(item);
                    }
                } else {
                    children.push(item);
                }
                break;
            }
            default:
                children.push(item);
                break;
        }
    };
};

export default definePlugin({
    name: "ChatPopouts",
    description: "Pop out channels and DMs into their own window",
    authors: [
        {
            name: "oakytreejr",
            id: 236691195718402048n,
        },
    ],
    tags: ["desktop", "chat", "dms", "text"],

    /**
     * Context menu patches.  Each key corresponds to a particular context
     * menu within Discord.  When the user right‑clicks on a channel in the
     * server list, a DM in the friends list, or a thread, we insert a
     * "Pop out chat" entry which opens the selected conversation in a new
     * window. 
     */
    contextMenus: {
        "channel-context": createContextMenuPatch("channel-context"),
        "thread-context": createContextMenuPatch("thread-context"),
        "gdm-context": createContextMenuPatch("gdm-context"),
        "user-context": createContextMenuPatch("user-context"),
    },

    /**
     * Reference to our MutationObserver so that it can be disconnected on stop.
     */
    _observer: null as MutationObserver | null,

    /**
     * Reference to the currently injected button so that it can be removed on stop.
     */
    _button: null as HTMLElement | null,

    /**
     * Called when the plugin is enabled. Sets up a MutationObserver to watch for
     * toolbar changes and injects the pop‑out button into the current channel
     * toolbar.
     */
    start() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (window as any).VencordNative === "undefined") {
            return;
        }

        // Create a MutationObserver to watch for toolbar creation/destruction.
        this._observer = new MutationObserver(() => {
            this.injectButton();
        });
        this._observer.observe(document.body, { childList: true, subtree: true });
        // Immediately attempt to inject the button on start.
        this.injectButton();

        // Bind the native helper to preserve the plugin context.  This allows
        // context menu actions to call the native function without losing
        // authentication.  The bound function is stored in a module‑level
        // variable so that context menu patches defined outside of the plugin
        // can access it.
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nativeHelpers: any = (window as any).VencordNative?.pluginHelpers;
            if (nativeHelpers) {
                const Native = nativeHelpers.ChatPopouts as PluginNative<typeof import("./native")>;
                if (Native && typeof Native.openPopout === "function") {
                    // Bind a helper that resolves the native module and calls
                    // openPopout each time it is invoked.  This avoids
                    // capturing a stale reference to `Native`, which can be
                    // invalidated when Discord reloads part of the UI.  It
                    // also ensures the plugin context is correctly passed
                    // through to the native function.  See `openPopoutWindow`
                    // for a similar implementation.
                    openPopoutFunc = async (url: string) => {
                        try {
                            // Resolve the native helper fresh from VencordNative
                            const nativeHelpers: any = (window as any).VencordNative?.pluginHelpers;
                            if (!nativeHelpers) return;
                            const NativeNow = nativeHelpers.ChatPopouts as PluginNative<typeof import("./native")>;
                            if (NativeNow && typeof NativeNow.openPopout === "function") {
                                await NativeNow.openPopout(url);
                            }
                        } catch {
                            // Ignore errors; context menu will simply do nothing
                        }
                    };
                }
            }
        } catch {
            // Ignore if binding fails; context menu will simply do nothing
        }
    },

    /**
     * Called when the plugin is disabled. Cleans up any injected buttons and
     * disconnects the MutationObserver.
     */
    stop() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this._button) {
            this._button.remove();
            this._button = null;
        }

        // Clear the bound helper when the plugin stops.
        openPopoutFunc = undefined;
    },

    /**
     * Attempts to find the channel toolbar and inject the pop‑out button.  If
     * the toolbar is not found or the button is already present, this method
     * simply returns without doing anything.
     */
    injectButton() {
        // If a button already exists, do not add another one.
        if (this._button && document.contains(this._button)) return;
        // Attempt to find the toolbar.  Discord often changes class names; this
        // selector matches the standard channel header toolbar used at the top
        // right of the chat area.  We fall back to a more permissive selector
        // that looks for any div with a class containing "toolbar".
        const toolbar =
            document.querySelector<HTMLElement>(
                ".toolbar-1t6TWx, .container-1CH86i .toolbar-1t6TWx, .container-1CH86i .toolbar"
            ) || document.querySelector<HTMLElement>('[class*="toolbar"]');
        if (!toolbar) return;
        // Avoid adding multiple pop‑out buttons in the same toolbar.
        if (toolbar.querySelector(".ChatPopoutButton")) return;

        // Create the button container.  Use the same classes as other toolbar
        // buttons to ensure consistent styling.
        const btn = document.createElement("div");
        btn.className = "iconWrapper-2OrFZ1 clickable-3rdHwn ChatPopoutButton";
        btn.setAttribute("role", "button");
        btn.setAttribute("aria-label", "Pop out chat");
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.cursor = "pointer";

        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V4.41l-4.3 4.3a1 1 0 1 1-1.4-1.42L19.58 3H16a1 1 0 0 1-1-1Z" />
                <path d="M5 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-6a1 1 0 1 0-2 0v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6a1 1 0 1 0 0-2H5Z" />
            </svg>
        `;
        // Attach the click handler.
        btn.addEventListener("click", () => {
            this.openPopoutWindow();
        });
        // Insert the button at the start of the toolbar so it appears on the left
        // of existing icons.  Prepend is supported in modern browsers.
        toolbar.prepend(btn);
        this._button = btn;
    },

    /**
     * Opens the current Discord conversation in a new window via the native
     * helper. The heavy lifting (interacting with Electron) lives in
     * `native.ts`.  If the native helper is unavailable, nothing happens.
     */
    async openPopoutWindow() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeHelpers: any = (window as any).VencordNative?.pluginHelpers;
        if (!nativeHelpers) return;
        // Acquire the native helper for this plugin.  The key must match the
        // `name` property passed to definePlugin below.  Cast via PluginNative
        // so TypeScript can infer the exported functions.
        const Native = nativeHelpers.ChatPopouts as PluginNative<typeof import("./native")>;
        if (!Native || typeof Native.openPopout !== "function") return;
        const url = window.location.href;
        try {
            await Native.openPopout(url);
        } catch (err) {
            console.error("ChatPopouts: failed to open pop‑out", err);
        }
    },
});