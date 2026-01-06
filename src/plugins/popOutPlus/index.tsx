/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";
import { ChannelRTCStore, FluxDispatcher, Menu, PopoutWindowStore, SelectedChannelStore } from "@webpack/common";

const POPOUT_KEY_PREFIX = "DISCORD_CALL_TILE_POPOUT";

const getCallTilePopoutKeys = (): string[] => {
    const keys = PopoutWindowStore?.getWindowKeys() ?? [];
    return keys.filter(k => k.startsWith(POPOUT_KEY_PREFIX));
};

const getCallTilePopoutKey = (): string | undefined => {
    return getCallTilePopoutKeys()[0];
};

const injectFullscreenControls = (popoutWindow: Window, popoutKey: string) => {
    const doc = popoutWindow.document;

    if (doc.getElementById("vc-popout-controls")) {
        return;
    }

    const popoutModule = findByProps("openCallTilePopout");

    // === WINDOW DRAGGING (JS-based for proper right-click context menu support) ===
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let windowStartX = 0;
    let windowStartY = 0;

    const dragLayer = doc.createElement("div");
    dragLayer.id = "vc-popout-drag-layer";
    dragLayer.style.cssText = `
        position: fixed;
        top: 22px;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99998;
        cursor: grab;
        background: transparent;
    `;

    const startDrag = (e: MouseEvent) => {
        isDragging = true;
        dragStartX = e.screenX;
        dragStartY = e.screenY;
        windowStartX = popoutWindow.screenX;
        windowStartY = popoutWindow.screenY;
        dragLayer.style.cursor = "grabbing";

        popoutWindow.addEventListener("mousemove", doDrag);
        popoutWindow.addEventListener("mouseup", endDrag);
    };

    const doDrag = (e: MouseEvent) => {
        if (!isDragging) return;
        const deltaX = e.screenX - dragStartX;
        const deltaY = e.screenY - dragStartY;
        popoutWindow.moveTo(windowStartX + deltaX, windowStartY + deltaY);
    };

    const endDrag = () => {
        if (isDragging) {
            isDragging = false;
            dragLayer.style.cursor = "grab";
            popoutWindow.removeEventListener("mousemove", doDrag);
            popoutWindow.removeEventListener("mouseup", endDrag);
        }
    };

    dragLayer.addEventListener("mousedown", (e: MouseEvent) => {
        if (e.button === 0) {
            e.preventDefault();
            startDrag(e);
        }
    });

    dragLayer.addEventListener("contextmenu", (e: MouseEvent) => {
        dragLayer.style.pointerEvents = "none";
        const elementBelow = doc.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        if (elementBelow) {
            const newEvent = new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
                view: popoutWindow,
                clientX: e.clientX,
                clientY: e.clientY,
                screenX: e.screenX,
                screenY: e.screenY,
                button: 2
            });
            elementBelow.dispatchEvent(newEvent);
        }
        setTimeout(() => {
            dragLayer.style.pointerEvents = "auto";
        }, 100);
        e.preventDefault();
    });

    const addDragLayer = () => {
        if (doc.body) {
            doc.body.appendChild(dragLayer);
        } else {
            setTimeout(addDragLayer, 100);
        }
    };
    addDragLayer();

    // Create container for buttons
    const container = doc.createElement("div");
    container.id = "vc-popout-controls";
    container.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        z-index: 99999;
        display: flex;
        gap: 6px;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
    `;

    // Show/hide logic
    let hideTimeout: number | null = null;

    const showControls = () => {
        container.style.opacity = "1";
        container.style.pointerEvents = "auto";

        if (hideTimeout) {
            clearTimeout(hideTimeout);
        }
        hideTimeout = setTimeout(hideControls, 3000) as unknown as number;
    };

    const hideControls = () => {
        container.style.opacity = "0";
        container.style.pointerEvents = "none";
    };

    doc.addEventListener("mousemove", showControls);
    doc.addEventListener("mouseenter", showControls);
    doc.addEventListener("mouseleave", hideControls);
    doc.addEventListener("keydown", () => showControls());

    // Double-click to fullscreen
    doc.addEventListener("dblclick", (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest("#vc-popout-controls") || target.tagName === "BUTTON") {
            return;
        }
        toggleFullscreen(doc);
    });

    // Common button factory
    const createButton = (id: string, icon: string, title: string): HTMLButtonElement => {
        const btn = doc.createElement("button");
        btn.id = id;
        btn.innerHTML = icon;
        btn.title = title;
        btn.style.cssText = `
            background: rgba(0, 0, 0, 0.6);
            color: white;
            border: none;
            border-radius: 4px;
            width: 32px;
            height: 32px;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.8;
            transition: opacity 0.2s, background 0.2s, transform 0.1s;
        `;
        btn.onmouseover = () => {
            btn.style.opacity = "1";
            btn.style.transform = "scale(1.1)";
        };
        btn.onmouseout = () => {
            if (!btn.dataset.active) btn.style.opacity = "0.8";
            btn.style.transform = "scale(1)";
        };
        return btn;
    };

    // === PIN BUTTON (Always on Top) ===
    const pinBtn = createButton("vc-popout-pin-btn", "📌", "Pin on Top\n\nShortcut: P\n\nKeeps window above all others");

    const updatePinState = () => {
        const isPinned = PopoutWindowStore?.getIsAlwaysOnTop(popoutKey) ?? false;
        pinBtn.dataset.active = isPinned ? "true" : "";
        pinBtn.style.opacity = isPinned ? "1" : "0.8";
        pinBtn.style.background = isPinned ? "rgba(88, 101, 242, 0.9)" : "rgba(0, 0, 0, 0.6)";
        pinBtn.title = isPinned
            ? "Unpin Window\n\nShortcut: P\n\nWindow will go behind others"
            : "Pin on Top\n\nShortcut: P\n\nKeeps window above all others";
    };

    const togglePin = () => {
        const isPinned = PopoutWindowStore?.getIsAlwaysOnTop(popoutKey) ?? false;
        popoutModule?.setAlwaysOnTop(popoutKey, !isPinned);
        setTimeout(updatePinState, 50);
    };

    pinBtn.onclick = togglePin;
    updatePinState();

    // === AUTO-FIT BUTTON (match current video display size) ===
    const fitBtn = createButton("vc-popout-fit-btn", "🗖", "Auto Fit\n\nShortcut: A\n\nResize window to fit current video size (remove black borders)");

    const getActualVideoSize = (video: HTMLVideoElement): { width: number; height: number; } | null => {
        const { videoWidth, videoHeight } = video;

        if (!videoWidth || !videoHeight) {
            return null;
        }

        const containerRect = video.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        if (!containerWidth || !containerHeight) {
            return null;
        }

        const videoAspect = videoWidth / videoHeight;
        const containerAspect = containerWidth / containerHeight;

        let actualWidth: number;
        let actualHeight: number;

        if (videoAspect > containerAspect) {
            actualWidth = containerWidth;
            actualHeight = containerWidth / videoAspect;
        } else {
            actualHeight = containerHeight;
            actualWidth = containerHeight * videoAspect;
        }

        return {
            width: Math.round(actualWidth),
            height: Math.round(actualHeight)
        };
    };

    const autoFitToVideo = () => {
        const video = doc.querySelector("video") as HTMLVideoElement;
        if (!video) return;

        const videoSize = getActualVideoSize(video);
        if (!videoSize) return;

        const videoRect = video.getBoundingClientRect();

        const containerPaddingX = popoutWindow.innerWidth - videoRect.width;
        const containerPaddingY = popoutWindow.innerHeight - videoRect.height;

        const chromeWidth = popoutWindow.outerWidth - popoutWindow.innerWidth;
        const chromeHeight = popoutWindow.outerHeight - popoutWindow.innerHeight;

        const newWidth = videoSize.width + containerPaddingX + chromeWidth;
        const newHeight = videoSize.height + containerPaddingY + chromeHeight;

        popoutWindow.resizeTo(newWidth, newHeight);
    };

    fitBtn.onclick = autoFitToVideo;

    // === CLEAR VIEW BUTTON (hide title bar) ===
    const clearViewBtn = createButton("vc-popout-clearview-btn", "👁", "Clear View\n\nShortcut: C\n\nHide title bar for clean viewing\n\n⚠️ Title bar needed to move window between monitors");
    let isClearView = false;

    const toggleClearView = () => {
        const titleBar = doc.querySelector('[class*="titleBar"]') as HTMLElement;

        if (!titleBar) return;

        isClearView = !isClearView;

        if (isClearView) {
            titleBar.style.display = "none";
            dragLayer.style.top = "0";
            clearViewBtn.dataset.active = "true";
            clearViewBtn.style.opacity = "1";
            clearViewBtn.style.background = "rgba(88, 101, 242, 0.9)";
            clearViewBtn.title = "Show Title Bar\n\nShortcut: C\n\nRestore title bar";
        } else {
            titleBar.style.display = "";
            dragLayer.style.top = "22px";
            clearViewBtn.dataset.active = "";
            clearViewBtn.style.opacity = "0.8";
            clearViewBtn.style.background = "rgba(0, 0, 0, 0.6)";
            clearViewBtn.title = "Clear View\n\nShortcut: C\n\nHide title bar for clean viewing";
        }
    };

    clearViewBtn.onclick = toggleClearView;

    // === FULLSCREEN BUTTON ===
    const fsBtn = createButton("vc-popout-fullscreen-btn", "⛶", "Fullscreen\n\nShortcuts: F, F11, Double-click");

    const updateFullscreenState = () => {
        const isFs = !!doc.fullscreenElement;
        fsBtn.dataset.active = isFs ? "true" : "";
        fsBtn.style.opacity = isFs ? "1" : "0.8";
        fsBtn.style.background = isFs ? "rgba(88, 101, 242, 0.9)" : "rgba(0, 0, 0, 0.6)";
        fsBtn.title = isFs
            ? "Exit Fullscreen\n\nShortcuts: F, ESC, Double-click"
            : "Fullscreen\n\nShortcuts: F, F11, Double-click";
    };

    fsBtn.onclick = () => toggleFullscreen(doc);

    doc.addEventListener("fullscreenchange", updateFullscreenState);

    // === KEYBOARD SHORTCUTS ===
    doc.addEventListener("keydown", (e: KeyboardEvent) => {
        if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") {
            return;
        }

        // F or F11 for fullscreen
        if (e.key === "F11" || (e.key === "f" && !e.ctrlKey && !e.altKey && !e.metaKey)) {
            e.preventDefault();
            toggleFullscreen(doc);
        }

        // P for pin/always on top
        if (e.key === "p" && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            togglePin();
        }

        // C for clear view (hide title bar)
        if (e.key === "c" && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            toggleClearView();
        }

        // A for auto-fit to video
        if (e.key === "a" && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            autoFitToVideo();
        }
    });

    // Add buttons to container
    container.appendChild(pinBtn);
    container.appendChild(clearViewBtn);
    container.appendChild(fitBtn);
    container.appendChild(fsBtn);

    // Wait for app-mount to be available
    const waitForAppMount = setInterval(() => {
        const appMount = doc.getElementById("app-mount");
        if (appMount) {
            clearInterval(waitForAppMount);
            appMount.appendChild(container);
            showControls();
        }
    }, 100);

    setTimeout(() => clearInterval(waitForAppMount), 5000);
};

const toggleFullscreen = (doc: Document) => {
    const appMount = doc.getElementById("app-mount");

    if (doc.fullscreenElement) {
        doc.exitFullscreen().catch(() => { });
    } else if (appMount?.requestFullscreen) {
        appMount.requestFullscreen().catch(() => {
            doc.documentElement.requestFullscreen().catch(() => { });
        });
    }
};

const patch = (children: any[], userId: string, isStream: boolean) => {
    const channelId = SelectedChannelStore.getVoiceChannelId();
    if (!channelId) return;

    const p = ChannelRTCStore.getParticipants(channelId)?.find((p: any) =>
        p.user?.id === userId && (isStream ? p.type === 0 : (p.type === 2 && (p.streamId || p.videoStreamId)))
    );

    if (p) {
        children.push(
            <Menu.MenuGroup>
                <Menu.MenuItem
                    id={isStream ? "popout-stream" : "popout-camera"}
                    label={isStream ? "Pop Out Stream" : "Pop Out Camera"}
                    action={() => {
                        const popoutModule = findByProps("openCallTilePopout");
                        popoutModule?.openCallTilePopout(channelId, p.id);
                    }}
                />
            </Menu.MenuGroup>
        );
    }
};

const onPopoutWindowOpen = (event: any) => {
    if (!event.key?.startsWith(POPOUT_KEY_PREFIX)) {
        return;
    }

    setTimeout(() => {
        const popoutWindow = PopoutWindowStore?.getWindow(event.key);
        if (popoutWindow) {
            injectFullscreenControls(popoutWindow, event.key);
        }
    }, 500);
};

export default definePlugin({
    name: "PopOut Plus",
    description: "Pop out streams and cameras with fullscreen support (press F or F11 in popout)",
    authors: [Devs.Ven, Devs.fantik],

    start() {
        FluxDispatcher.subscribe("POPOUT_WINDOW_OPEN", onPopoutWindowOpen);

        // Inject into any already-open popouts
        setTimeout(() => {
            const keys = getCallTilePopoutKeys();
            keys.forEach(key => {
                const popoutWindow = PopoutWindowStore?.getWindow(key);
                if (popoutWindow) {
                    injectFullscreenControls(popoutWindow, key);
                }
            });
        }, 100);
    },

    stop() {
        FluxDispatcher.unsubscribe("POPOUT_WINDOW_OPEN", onPopoutWindowOpen);
    },

    contextMenus: {
        "stream-context": (children, { stream }) => stream && patch(children, stream.ownerId, true),
        "user-context": (children, { user }) => user && patch(children, user.id, false)
    }
});
