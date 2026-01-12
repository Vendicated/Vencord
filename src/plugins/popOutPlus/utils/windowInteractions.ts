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
        const target = doc.getElementById("app-mount") ?? doc.documentElement;
        target.requestFullscreen().catch(() => { });
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

// For this feature we need to get actual video width and heights. Stores can return to us only original resolution
export const autoFitPopout = (win: Window) => {
    const video = win.document.querySelector("video") as HTMLVideoElement;
    if (!video?.videoWidth || !video?.videoHeight) return;

    const { videoWidth, videoHeight } = video;
    const rect = video.getBoundingClientRect();
    const aspect = videoWidth / videoHeight;

    const [width, height] = aspect > rect.width / rect.height
        ? [rect.width, rect.width / aspect]
        : [rect.height * aspect, rect.height];

    const paddingX = win.innerWidth - rect.width;
    const paddingY = win.innerHeight - rect.height;
    const chromeX = win.outerWidth - win.innerWidth;
    const chromeY = win.outerHeight - win.innerHeight;

    win.resizeTo(
        Math.round(width) + paddingX + chromeX,
        Math.round(height) + paddingY + chromeY
    );
};
