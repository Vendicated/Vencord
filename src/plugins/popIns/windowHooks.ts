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
            // Error attaching to button
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
                // Failed to observe window
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
    if (!WindowStore) {
        return;
    }

    try {
        const windowKeys = WindowStore.getWindowKeys();

        // Check if the set of native windows has actually changed
        const hasChanged = windowKeys.length !== lastKnownWindowKeys.length ||
            windowKeys.some(key => !lastKnownWindowKeys.includes(key));

        if (hasChanged) {
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
        // Error in handleWindowChange
    }
}

/**
 * Get WindowStore for external use.
 */
export function getWindowStore() {
    return WindowStore;
}
