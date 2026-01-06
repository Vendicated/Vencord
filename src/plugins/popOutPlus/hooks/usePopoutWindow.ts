/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByProps } from "@webpack";
import { PopoutWindowStore, useCallback, useEffect, useState } from "@webpack/common";

let popoutModule: any;
const getPopoutModule = () => popoutModule ??= findByProps("openCallTilePopout");

export const usePopoutWindow = (popoutKey: string) => {
    const [isPinned, setIsPinned] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isClearView, setIsClearView] = useState(false);

    const updateStates = useCallback(() => {
        setIsPinned(PopoutWindowStore?.getIsAlwaysOnTop(popoutKey) ?? false);
        const win = PopoutWindowStore?.getWindow(popoutKey);
        setIsFullscreen(!!win?.document.fullscreenElement);
    }, [popoutKey]);

    useEffect(() => {
        updateStates();
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        const handleFsChange = () => setIsFullscreen(!!win.document.fullscreenElement);
        win.document.addEventListener("fullscreenchange", handleFsChange);

        return () => {
            win.document.removeEventListener("fullscreenchange", handleFsChange);
        };
    }, [popoutKey, updateStates]);

    const togglePin = useCallback(() => {
        const next = !isPinned;
        getPopoutModule()?.setAlwaysOnTop(popoutKey, next);
        setIsPinned(next);
    }, [isPinned, popoutKey]);

    const toggleFullscreen = useCallback(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        const doc = win.document;
        const appMount = doc.getElementById("app-mount");

        if (doc.fullscreenElement) {
            doc.exitFullscreen().catch(() => { });
        } else if (appMount?.requestFullscreen) {
            appMount.requestFullscreen().catch(() => {
                doc.documentElement.requestFullscreen().catch(() => { });
            });
        }
    }, [popoutKey]);

    const toggleClearView = useCallback(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        const titleBar = win.document.querySelector('[class*="titleBar"]') as HTMLElement;
        if (!titleBar) return;

        const next = !isClearView;
        setIsClearView(next);
        titleBar.style.display = next ? "none" : "";
    }, [isClearView, popoutKey]);

    const autoFitToVideo = useCallback(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

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
    }, [popoutKey]);

    return {
        isPinned,
        isFullscreen,
        isClearView,
        togglePin,
        toggleFullscreen,
        toggleClearView,
        autoFitToVideo
    };
};
