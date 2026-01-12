/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PopoutStore } from "@plugins/popOutPlus/store";
import { PopoutWindowStore, useEffect, useStateFromStores } from "@webpack/common";

export const useWindowDragging = (popoutKey: string) => {
    const isDragging = useStateFromStores(
        [PopoutStore as any],
        () => PopoutStore.isDragging(popoutKey),
        [popoutKey]
    );

    useEffect(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        const handleKeyChange = (e: KeyboardEvent) => {
            PopoutStore.setDragging(popoutKey, e.ctrlKey);
        };

        const handleReset = () => {
            PopoutStore.setDragging(popoutKey, false);
        };

        win.addEventListener("keydown", handleKeyChange);
        win.addEventListener("keyup", handleKeyChange);
        win.addEventListener("blur", handleReset);

        return () => {
            win.removeEventListener("keydown", handleKeyChange);
            win.removeEventListener("keyup", handleKeyChange);
            win.removeEventListener("blur", handleReset);
            PopoutStore.setDragging(popoutKey, false);
        };
    }, [popoutKey]);

    return { isDragging };
};
