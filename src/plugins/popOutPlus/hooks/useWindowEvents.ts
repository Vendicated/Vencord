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

        const doc = win.document;

        if (onActivity) {
            doc.addEventListener("mousemove", onActivity);
            doc.addEventListener("mouseenter", onActivity);
        }
        if (onKeyDown) {
            doc.addEventListener("keydown", onKeyDown);
        }
        if (onDblClick) {
            doc.addEventListener("dblclick", onDblClick);
        }

        return () => {
            if (onActivity) {
                doc.removeEventListener("mousemove", onActivity);
                doc.removeEventListener("mouseenter", onActivity);
            }
            if (onKeyDown) {
                doc.removeEventListener("keydown", onKeyDown);
            }
            if (onDblClick) {
                doc.removeEventListener("dblclick", onDblClick);
            }
        };
    }, [popoutKey, onActivity, onKeyDown, onDblClick]);
};
