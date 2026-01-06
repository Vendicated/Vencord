/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addFullscreenListener, autoFitPopout, isWindowClearView, setPopoutAlwaysOnTop, setPopoutClearView, togglePopoutFullscreen } from "@plugins/popOutPlus/utils/windowInteractions";
import { PopoutWindowStore, useCallback, useEffect, useState } from "@webpack/common";

export const usePopoutWindow = (popoutKey: string) => {
    const [isPinned, setIsPinned] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isClearView, setIsClearView] = useState(false);

    const updateStates = useCallback(() => {
        setIsPinned(PopoutWindowStore?.getIsAlwaysOnTop(popoutKey) ?? false);
        const win = PopoutWindowStore?.getWindow(popoutKey);
        // @ts-ignore
        if (PopoutWindowStore?.isWindowFullScreen) {
            // @ts-ignore
            setIsFullscreen(PopoutWindowStore.isWindowFullScreen(popoutKey));
        }

        if (win) {
            setIsClearView(isWindowClearView(win));
        }
    }, [popoutKey]);

    useEffect(() => {
        updateStates();
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        return addFullscreenListener(win, setIsFullscreen);
    }, [popoutKey, updateStates]);

    const togglePin = useCallback(() => {
        const next = !isPinned;
        setPopoutAlwaysOnTop(popoutKey, next);
        setIsPinned(next);
    }, [isPinned, popoutKey]);

    const toggleFullscreen = useCallback(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;
        togglePopoutFullscreen(win);
        // State update happens via event listener, but we can optimistically flip if we trust it
    }, [popoutKey]);

    const toggleClearView = useCallback(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        const next = !isClearView;
        setIsClearView(next);
        setPopoutClearView(win, next);
    }, [isClearView, popoutKey]);

    const autoFitToVideo = useCallback(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;
        autoFitPopout(win);
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
