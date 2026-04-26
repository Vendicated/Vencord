/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PopoutActions } from "@webpack/common";


export const setPopoutAlwaysOnTop = (popoutKey: string, enabled: boolean) => {
    PopoutActions.setAlwaysOnTop(popoutKey, enabled);
};

/**
 * PopoutWindowStore?.isWindowFullScreen is only checking if app-mount is fullscreen element
 * And patching out whole app-mount is seems like overkill, especcially if we still enforced
 * to use win.document.exitFullscreen to exit fullscreen
 *
 */
export const togglePopoutFullscreen = (win: Window, popoutKey: string) => {
    const isFullscreen = win.document.fullscreenElement;

    if (isFullscreen) {
        win.document.exitFullscreen().catch(() => { });
    } else {
        win.document.documentElement.requestFullscreen().catch(() => { });
    }
};

// For this feature we need to get actual video width and heights. Stores can return to us only original resolution
export const autoFitPopout = (win: Window & { __vc_popout_video?: HTMLVideoElement; }) => {
    // Video element is set by DirectVideo patch on the popout window
    const video = win.__vc_popout_video;
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
