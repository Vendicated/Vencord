/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PopoutWindowStore, useEffect, useState } from "@webpack/common";

export const useWindowDragging = (popoutKey: string) => {
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        const handleKeyChange = (e: KeyboardEvent) => {
            const active = e.ctrlKey;
            setIsDragging(active);
            if (active) {
                win.document.body.classList.add("vc-popout-dragging");
            } else {
                win.document.body.classList.remove("vc-popout-dragging");
            }
        };

        const handleBlur = () => {
            setIsDragging(false);
            win.document.body.classList.remove("vc-popout-dragging");
        };

        win.addEventListener("keydown", handleKeyChange);
        win.addEventListener("keyup", handleKeyChange);
        win.addEventListener("blur", handleBlur);

        return () => {
            win.removeEventListener("keydown", handleKeyChange);
            win.removeEventListener("keyup", handleKeyChange);
            win.removeEventListener("blur", handleBlur);
            win.document.body.classList.remove("vc-popout-dragging");
        };
    }, [popoutKey]);

    return { isDragging };
};
