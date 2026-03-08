/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 watchthelight
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./latex.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { isLoaded, loadKaTeX, renderToString, unloadKaTeX } from "./katex";
import { settings } from "./settings";

const BLOCK_MATH_RE = /\$\$([\s\S]+?)\$\$/g;
const INLINE_MATH_RE = /(?<![\\$\d])\$(?!\$)(.+?)(?<![\\$])\$/g;

function extractText(node: any): string {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (!node?.props) return "";

    const children = extractText(node.props.children);

    if (node.type === "em" || node.type === "i") return `_${children}_`;
    if (node.type === "strong" || node.type === "b") return `**${children}**`;
    if (node.type === "u") return `__${children}__`;
    if (node.type === "del" || node.type === "s") return `~~${children}~~`;

    return children;
}

function buildLatexContent(fullText: string, enableBlock: boolean, enableInline: boolean): any[] | null {
    const fragments: { start: number; end: number; latex: string; display: boolean; }[] = [];

    if (enableBlock) {
        BLOCK_MATH_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = BLOCK_MATH_RE.exec(fullText)) !== null) {
            fragments.push({
                start: match.index,
                end: match.index + match[0].length,
                latex: match[1].trim(),
                display: true,
            });
        }
    }

    if (enableInline) {
        const occupied = fragments.map(f => [f.start, f.end] as const);
        INLINE_MATH_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = INLINE_MATH_RE.exec(fullText)) !== null) {
            const s = match.index;
            const e = match.index + match[0].length;
            if (!occupied.some(([os, oe]) => s < oe && e > os)) {
                fragments.push({ start: s, end: e, latex: match[1].trim(), display: false });
            }
        }
    }

    if (fragments.length === 0) return null;
    fragments.sort((a, b) => a.start - b.start);

    const result: any[] = [];
    let lastIdx = 0;

    for (const f of fragments) {
        if (f.start > lastIdx) {
            result.push(fullText.slice(lastIdx, f.start));
        }

        const html = renderToString(f.latex, f.display);
        result.push(
            <span
                className={f.display ? "vc-latex-block" : "vc-latex-inline"}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );

        lastIdx = f.end;
    }

    if (lastIdx < fullText.length) {
        result.push(fullText.slice(lastIdx));
    }

    return result;
}

export default definePlugin({
    name: "LatexMath",
    description: "Renders LaTeX math expressions in Discord messages using $$ and $ delimiters",
    authors: [Devs.watchthelight],
    settings,

    patches: [
        {
            find: '["strong","em","u","text","inlineCode","s","spoiler"]',
            replacement: {
                match: /(?=return{hasSpoilerEmbeds:\i,hasBailedAst:\i,content:(\i)})/,
                replace: (_, content: string) => `${content}=$self.processLatex(${content});`,
            },
        },
    ],

    async start() {
        await loadKaTeX(settings.store.cdnUrl || undefined);
    },

    stop() {
        unloadKaTeX();
    },

    processLatex(content: any[]): any[] {
        if (!isLoaded()) return content;

        const enableBlock = settings.store.enableBlockMath;
        const enableInline = settings.store.enableInlineMath;
        if (!enableBlock && !enableInline) return content;

        const fullText = content.map(extractText).join("");
        if (!fullText.includes("$")) return content;

        return buildLatexContent(fullText, enableBlock, enableInline) ?? content;
    },
});
