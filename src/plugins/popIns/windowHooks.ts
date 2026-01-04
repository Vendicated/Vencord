/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { logger } from "./constants";
import { closeAllWindows, openWindows } from "./components/FloatingWindow";
import { toggleFakeFullscreen } from "./components/FakeFullscreen";
import { WindowStore } from "./stores";

// Track known window keys to detect changes
let lastKnownWindowKeys: string[] = [];

// WeakMap to track observers per window
const windowObservers = new WeakMap<Window, MutationObserver>();

/**
 * Hook a window to intercept participant button clicks.
 */
export function hookWindow(win: Window): void {
    if (!win) return;
    if (windowObservers.has(win)) return;

    let winName = "unknown";
    try { winName = win.name || "Main Window"; } catch (e) { winName = "Access Error"; }

    // Function to attach listener to button
    const attachToButton = () => {
        try {
            const btn = win.document.querySelector('[class*="-participantsButton"]') as HTMLElement;

            if (btn && !btn.getAttribute("data-pin-hooked")) {
                btn.addEventListener("click", (e) => {
                    if (openWindows.size > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        const targetDoc = (e.view as Window)?.document || document;
                        toggleFakeFullscreen(targetDoc);
                    }
                }, true); // Capture phase

                btn.setAttribute("data-pin-hooked", "true");
            }
        } catch (err) {
            logger.error(`Error attaching to button in ${winName}:`, err);
        }
    };

    // Observe the document for changes to find the button when it renders
    const observer = new MutationObserver(() => {
        attachToButton();
    });

    const startObserving = () => {
        if (!win || win.closed) return;

        const target = win.document.documentElement;
        if (target) {
            try {
                observer.observe(target, { childList: true, subtree: true });
                windowObservers.set(win, observer);
                attachToButton();
            } catch (e) {
                logger.error(`Failed to observe ${winName}:`, e);
            }
        } else {
            // Document not ready, retry
            setTimeout(startObserving, 100);
        }
    };

    // Polling backup - ensures we catch the button even if MO misses it
    const pollInterval = setInterval(() => {
        if (!win || win.closed) {
            clearInterval(pollInterval);
            return;
        }
        attachToButton();
    }, 1000);

    // Store poll interval on the window object
    (win as any).__pin_poll = pollInterval;

    startObserving();
}

/**
 * Unhook a window and cleanup observers.
 */
export function unhookWindow(win: Window): void {
    if (!win) return;

    // Disconnect observer
    const observer = windowObservers.get(win);
    if (observer) {
        observer.disconnect();
        windowObservers.delete(win);
    }

    // Clear poll interval
    if ((win as any).__pin_poll) {
        clearInterval((win as any).__pin_poll);
        delete (win as any).__pin_poll;
    }
}

/**
 * Handle WindowStore changes - hook new windows, close popouts when windows change.
 */
export function handleWindowChange(): void {
    logger.info("WindowStore changed (or initialization)");

    if (!WindowStore) {
        logger.warn("WindowStore is not available in handleWindowChange");
        return;
    }

    try {
        const windowKeys = WindowStore.getWindowKeys();

        // Check if the set of native windows has actually changed
        const hasChanged = windowKeys.length !== lastKnownWindowKeys.length ||
            windowKeys.some(key => !lastKnownWindowKeys.includes(key));

        if (hasChanged) {
            logger.info("Native windows set changed, closing all custom popouts");
            closeAllWindows();
            lastKnownWindowKeys = [...windowKeys];
        }

        // Hook main window
        hookWindow(window);

        // Hook all other known windows
        for (const key of windowKeys) {
            const win = WindowStore.getWindow(key);
            if (win) {
                hookWindow(win);
            }
        }
    } catch (e) {
        logger.error("Error in handleWindowChange:", e);
    }
}

/**
 * Get WindowStore for external use.
 */
export function getWindowStore() {
    return WindowStore;
}
