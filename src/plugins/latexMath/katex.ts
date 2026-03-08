/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 watchthelight
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

const logger = new Logger("LatexMath");
const DEFAULT_CDN = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist";

let katexInstance: any = null;
let loadPromise: Promise<void> | null = null;
let linkEl: HTMLLinkElement | null = null;

export async function loadKaTeX(cdnBase?: string): Promise<void> {
    if (katexInstance) return;
    if (loadPromise) return loadPromise;

    const base = cdnBase || DEFAULT_CDN;

    loadPromise = (async () => {
        try {
            linkEl = document.createElement("link");
            linkEl.rel = "stylesheet";
            linkEl.href = `${base}/katex.min.css`;
            document.head.appendChild(linkEl);

            const res = await fetch(`${base}/katex.min.js`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const js = await res.text();
            (0, eval)(js);

            katexInstance = (window as any).katex;
            if (!katexInstance) throw new Error("KaTeX global not found after eval");

            logger.info("KaTeX loaded successfully");
        } catch (e) {
            logger.error("Failed to load KaTeX:", e);
            loadPromise = null;
            throw e;
        }
    })();

    return loadPromise;
}

export function unloadKaTeX(): void {
    linkEl?.remove();
    linkEl = null;
    katexInstance = null;
    loadPromise = null;
    delete (window as any).katex;
}

export function isLoaded(): boolean {
    return katexInstance != null;
}

export function renderToString(latex: string, displayMode: boolean): string {
    if (!katexInstance) return latex;
    return katexInstance.renderToString(latex, {
        displayMode,
        throwOnError: false,
        errorColor: "#cc0000",
        trust: true,
        strict: false,
    });
}
