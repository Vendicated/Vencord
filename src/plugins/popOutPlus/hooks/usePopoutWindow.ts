/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ClearViewStore } from "@plugins/popOutPlus/store";
import { autoFitPopout, setPopoutAlwaysOnTop, togglePopoutFullscreen } from "@plugins/popOutPlus/utils/windowInteractions";
import { PopoutWindowStore, useCallback, useStateFromStores } from "@webpack/common";

export const usePopoutWindow = (popoutKey: string) => {
    const isClearView = useStateFromStores(
        [ClearViewStore as any],
        () => ClearViewStore.isClearView(popoutKey),
        [popoutKey]
    );

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

    const togglePin = useCallback(() => {
        setPopoutAlwaysOnTop(popoutKey, !isPinned);
    }, [isPinned, popoutKey]);

    const toggleFullscreen = useCallback(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;
        togglePopoutFullscreen(win, popoutKey);
    }, [popoutKey]);

    const toggleClearView = useCallback(() => {
        const next = !isClearView;
        ClearViewStore.setClearView(popoutKey, next);
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
