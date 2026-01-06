/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByProps } from "@webpack";
import { PopoutWindowStore } from "@webpack/common";

export const POPOUT_ROOT_ID = "vc-popout-plus-root";

let popoutModule: any;
const getPopoutModule = () => popoutModule ??= findByProps("openCallTilePopout");

export const setPopoutAlwaysOnTop = (popoutKey: string, enabled: boolean) => {
    getPopoutModule()?.setAlwaysOnTop(popoutKey, enabled);
};

export const togglePopoutFullscreen = (win: Window, popoutKey: string) => {
    const doc = win.document;

    // Use store to check fullscreen state instead of DOM query
    if (PopoutWindowStore?.isWindowFullScreen?.(popoutKey)) {
        doc.exitFullscreen().catch(() => { });
    } else {
        const appMount = doc.getElementById("app-mount");
        if (appMount?.requestFullscreen) {
            appMount.requestFullscreen().catch(() => {
                doc.documentElement.requestFullscreen().catch(() => { });
            });
        }
    }
};

export const setPopoutClearView = (win: Window, enabled: boolean) => {
    const titleBar = win.document.querySelector('[class*="titleBar"]') as HTMLElement;
    if (titleBar) {
        titleBar.style.display = enabled ? "none" : "";
    }
    // Also toggle a class on the body for potential CSS usage
    if (enabled) {
        win.document.body.classList.add("vc-popout-clear-view");
    } else {
        win.document.body.classList.remove("vc-popout-clear-view");
    }
};

export const isWindowClearView = (win: Window): boolean => {
    return win.document.body.classList.contains("vc-popout-clear-view");
};

export const ensurePopoutRoot = (win: Window, callback: (root: HTMLElement) => void) => {
    const doc = win.document;
    if (doc.getElementById(POPOUT_ROOT_ID)) return;

    const check = () => {
        const appMount = doc.getElementById("app-mount");
        if (appMount) {
            const rootDiv = doc.createElement("div");
            rootDiv.id = POPOUT_ROOT_ID;
            appMount.appendChild(rootDiv);
            callback(rootDiv);
            return true;
        }
        return false;
    };

    if (!check()) {
        const interval = setInterval(() => {
            if (check()) clearInterval(interval);
        }, 100);
        setTimeout(() => clearInterval(interval), 5000);
    }
};

export const observeWindowInteractions = (
    win: Window,
    callbacks: {
        onActivity?: () => void;
        onKeyDown?: (e: KeyboardEvent) => void;
        onDblClick?: (e: MouseEvent) => void;
    }
) => {
    const doc = win.document;
    const { onActivity, onKeyDown, onDblClick } = callbacks;
    const cleanups: (() => void)[] = [];

    if (onActivity) {
        doc.addEventListener("mousemove", onActivity);
        doc.addEventListener("mouseenter", onActivity);
        cleanups.push(() => {
            doc.removeEventListener("mousemove", onActivity);
            doc.removeEventListener("mouseenter", onActivity);
        });
    }

    if (onKeyDown) {
        doc.addEventListener("keydown", onKeyDown);
        cleanups.push(() => doc.removeEventListener("keydown", onKeyDown));
    }

    if (onDblClick) {
        doc.addEventListener("dblclick", onDblClick);
        cleanups.push(() => doc.removeEventListener("dblclick", onDblClick));
    }

    return () => cleanups.forEach(c => c());
};

export const startWindowDrag = (
    win: Window,
    initialEvent: { screenX: number, screenY: number; },
    onDragStart?: () => void,
    onDragEnd?: () => void,
    dragElement?: HTMLElement
) => {
    const startX = initialEvent.screenX;
    const startY = initialEvent.screenY;
    const startWinX = win.screenX;
    const startWinY = win.screenY;

    if (dragElement) dragElement.style.cursor = "grabbing";
    if (onDragStart) onDragStart();

    const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.screenX - startX;
        const deltaY = e.screenY - startY;
        win.moveTo(startWinX + deltaX, startWinY + deltaY);
    };

    const handleMouseUp = () => {
        win.removeEventListener("mousemove", handleMouseMove);
        win.removeEventListener("mouseup", handleMouseUp);
        if (dragElement) dragElement.style.cursor = "grab";
        if (onDragEnd) onDragEnd();
    };

    win.addEventListener("mousemove", handleMouseMove);
    win.addEventListener("mouseup", handleMouseUp);
};

export const dispatchContextMenuEvent = (
    win: Window,
    x: number,
    y: number,
    screenX: number,
    screenY: number
) => {
    const elementBelow = win.document.elementFromPoint(x, y) as HTMLElement;
    if (elementBelow) {
        const newEvent = new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            view: win,
            clientX: x,
            clientY: y,
            screenX: screenX,
            screenY: screenY,
            button: 2
        });
        elementBelow.dispatchEvent(newEvent);
    }
};

export const dispatchContextMenuThroughOverlay = (
    win: Window,
    overlayElement: HTMLElement,
    x: number,
    y: number,
    screenX: number,
    screenY: number
) => {
    overlayElement.style.pointerEvents = "none";
    dispatchContextMenuEvent(win, x, y, screenX, screenY);
    setTimeout(() => {
        overlayElement.style.pointerEvents = "auto";
    }, 100);
};

export const movePopout = (win: Window, x: number, y: number) => {
    win.moveTo(x, y);
};

export const autoFitPopout = (win: Window) => {
    const doc = win.document;
    const video = doc.querySelector("video") as HTMLVideoElement;
    if (!video) return;

    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) return;

    const containerRect = video.getBoundingClientRect();
    if (!containerRect.width || !containerRect.height) return;

    const videoAspect = videoWidth / videoHeight;
    const containerAspect = containerRect.width / containerRect.height;

    let actualWidth: number;
    let actualHeight: number;

    if (videoAspect > containerAspect) {
        actualWidth = containerRect.width;
        actualHeight = containerRect.width / videoAspect;
    } else {
        actualHeight = containerRect.height;
        actualWidth = containerRect.height * videoAspect;
    }

    const videoSize = {
        width: Math.round(actualWidth),
        height: Math.round(actualHeight)
    };

    const containerPaddingX = win.innerWidth - containerRect.width;
    const containerPaddingY = win.innerHeight - containerRect.height;

    const chromeWidth = win.outerWidth - win.innerWidth;
    const chromeHeight = win.outerHeight - win.innerHeight;

    const newWidth = videoSize.width + containerPaddingX + chromeWidth;
    const newHeight = videoSize.height + containerPaddingY + chromeHeight;

    win.resizeTo(newWidth, newHeight);
};
