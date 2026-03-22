/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Revilo0509
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "microslop",
    description: "WARNING: Uses direct DOM manipulation. May cause other stuff to break. Replaces any and all occurrences of \"microsoft\" to \"microslop\" (case-insensitive)",
    authors: [Devs.revilo0509],

    start() {
        this.scan();

        const observer = new MutationObserver(() => {
            this.scan();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.observer = observer;
    },

    stop() {
        this.observer?.disconnect();
    },

    scan() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
        );

        let node: Node | null;
        while ((node = walker.nextNode())) {
            const original = node.nodeValue;
            if (!original) continue;

            const replaced = original.replace(/microsoft/gi, (match: string) => {
                const replacement = "microslop";
                return match.split("").map((char: string, i: string | number) => {
                    const repChar = replacement[i] ?? "";
                    return char === char.toUpperCase()
                        ? repChar.toUpperCase()
                        : repChar.toLowerCase();
                }).join("");
            });

            if (original !== replaced) {
                node.nodeValue = replaced;
            }
        }
    }
});
