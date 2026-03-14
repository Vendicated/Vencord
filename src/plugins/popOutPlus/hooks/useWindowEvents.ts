/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PopoutWindowStore, useEffect } from "@webpack/common";

interface WindowEventCallbacks {
    onActivity?: () => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    onDblClick?: (e: MouseEvent) => void;
}

export const useWindowEvents = (popoutKey: string, callbacks: WindowEventCallbacks) => {
    const { onActivity, onKeyDown, onDblClick } = callbacks;

    useEffect(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        if (onActivity) {
            win.addEventListener("mousemove", onActivity);
            win.addEventListener("mouseenter", onActivity);
        }
        if (onKeyDown) {
            win.addEventListener("keydown", onKeyDown);
        }
        if (onDblClick) {
            win.addEventListener("dblclick", onDblClick);
        }

        return () => {
            if (onActivity) {
                win.removeEventListener("mousemove", onActivity);
                win.removeEventListener("mouseenter", onActivity);
            }
            if (onKeyDown) {
                win.removeEventListener("keydown", onKeyDown);
            }
            if (onDblClick) {
                win.removeEventListener("dblclick", onDblClick);
            }
        };
    }, [popoutKey, onActivity, onKeyDown, onDblClick]);
};
