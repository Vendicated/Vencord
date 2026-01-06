/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PopoutActions, PopoutWindowStore } from "@webpack/common";

export const POPOUT_ROOT_ID = "vc-popout-plus-root";

export const setPopoutAlwaysOnTop = (popoutKey: string, enabled: boolean) => {
    PopoutActions.setAlwaysOnTop(popoutKey, enabled);
};

// There is no native/react method to enforce fullscreen
export const togglePopoutFullscreen = (win: Window, popoutKey: string) => {
    const doc = win.document;

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

// I've not found how to dynamically change class list for separate popups windows except this method
export const setPopoutClearView = (win: Window, enabled: boolean) => {
    if (enabled) {
        win.document.body.classList.add("vc-popout-clear-view");
    } else {
        win.document.body.classList.remove("vc-popout-clear-view");
    }
};

// I've not found the better way to add react component into popout page. PopoutWindowStore.getWindow returns window object
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
