/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef, useState } from "@webpack/common";

export function useTruncatedText(text: string) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [truncated, setTruncated] = useState(text);

    useEffect(() => {
        if (!containerRef.current) return;

        const el = containerRef.current;
        const maxHeight = 36;

        const currentText = text;
        el.textContent = currentText;

        if (el.scrollHeight <= maxHeight) {
            setTruncated(currentText);
            return;
        }

        let start = 0;
        let end = currentText.length;

        while (start < end) {
            const mid = Math.floor((start + end) / 2);
            const testText = currentText.slice(0, mid).trim() + "…";
            el.textContent = testText;

            if (el.scrollHeight <= maxHeight) {
                start = mid + 1;
            } else {
                end = mid;
            }
        }
        const finalText = currentText.slice(0, end - 1).trim() + "…";
        setTruncated(finalText);
    }, [text]);

    return { truncated, containerRef };
}
