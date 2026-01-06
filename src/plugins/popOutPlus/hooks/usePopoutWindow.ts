/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { autoFitPopout, isWindowClearView, setPopoutAlwaysOnTop, setPopoutClearView, togglePopoutFullscreen } from "@plugins/popOutPlus/utils/windowInteractions";
import { PopoutWindowStore, useCallback, useEffect, useState, useStateFromStores } from "@webpack/common";

export const usePopoutWindow = (popoutKey: string) => {
    const [isClearView, setIsClearView] = useState(false);

    // Use store subscriptions for reactive state
    const isPinned = useStateFromStores(
        [PopoutWindowStore],
        () => PopoutWindowStore?.getIsAlwaysOnTop(popoutKey) ?? false,
        [popoutKey]
    );

    const isFullscreen = useStateFromStores(
        [PopoutWindowStore],
        () => PopoutWindowStore?.isWindowFullScreen?.(popoutKey) ?? false,
        [popoutKey]
    );

    // ClearView still needs local state since it's not tracked by a store
    useEffect(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (win) {
            setIsClearView(isWindowClearView(win));
        }
    }, [popoutKey]);

    const togglePin = useCallback(() => {
        setPopoutAlwaysOnTop(popoutKey, !isPinned);
        // State update happens automatically via store subscription
    }, [isPinned, popoutKey]);

    const toggleFullscreen = useCallback(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;
        togglePopoutFullscreen(win, popoutKey);
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
