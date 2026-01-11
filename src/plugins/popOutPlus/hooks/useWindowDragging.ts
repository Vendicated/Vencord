/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PopoutWindowStore, useCallback, useRef, useState } from "@webpack/common";

export const useWindowDragging = (popoutKey: string) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragDataRef = useRef<{ startX: number, startY: number, startWinX: number, startWinY: number; } | null>(null);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click

        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        dragDataRef.current = {
            startX: e.screenX,
            startY: e.screenY,
            startWinX: win.screenX,
            startWinY: win.screenY
        };

        setIsDragging(true);

        const handleMouseMove = (evt: MouseEvent) => {
            const data = dragDataRef.current;
            if (!data) return;

            const deltaX = evt.screenX - data.startX;
            const deltaY = evt.screenY - data.startY;
            win.moveTo(data.startWinX + deltaX, data.startWinY + deltaY);
        };

        const handleMouseUp = () => {
            win.removeEventListener("mousemove", handleMouseMove);
            win.removeEventListener("mouseup", handleMouseUp);
            setIsDragging(false);
            dragDataRef.current = null;
        };

        win.addEventListener("mousemove", handleMouseMove);
        win.addEventListener("mouseup", handleMouseUp);
    }, [popoutKey]);

    return {
        onMouseDown,
        isDragging
    };
};
