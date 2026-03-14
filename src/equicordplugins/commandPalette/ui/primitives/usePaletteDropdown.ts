/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from "@webpack/common";

export function usePaletteDropdown<T>(items: T[]) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);

    useEffect(() => {
        if (items.length === 0) {
            setHighlightIndex(-1);
            return;
        }

        if (highlightIndex >= items.length) {
            setHighlightIndex(0);
        }
    }, [highlightIndex, items.length]);

    const moveHighlight = (direction: 1 | -1) => {
        if (items.length === 0) return;
        setHighlightIndex(current => {
            if (current < 0) return direction > 0 ? 0 : 0;
            const next = current + direction;
            if (next < 0) return 0;
            if (next >= items.length) return items.length - 1;
            return next;
        });
    };

    const reset = () => {
        setHighlightIndex(-1);
    };

    return {
        isOpen,
        highlightIndex,
        setIsOpen,
        setHighlightIndex,
        moveHighlight,
        reset
    };
}
