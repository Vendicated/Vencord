/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

function uwuify(text: string): string {
    return text
        .replace(/r/g, 'w')
        .replace(/l/g, 'w')
        .replace(/R/g, 'W')
        .replace(/L/g, 'W')
        .replace(/n([aeiou])/g, (match) => `ny${match[1]}`)
        .replace(/N([aeiou])/g, (match) => `Ny${match[1]}`)
        .replace(/N([AEIOU])/g, (match) => `NY${match[1]}`)
        .replace(/ove/g, 'uv');
}

function uwuifyTextContent(node: Node): void {
    if (node.nodeType === 3) {
        node.nodeValue = uwuify(node.nodeValue || '');
    } else if (node.nodeType === 1 && node.childNodes) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        if (!['input', 'textarea', 'script', 'style'].includes(tagName) && !element.isContentEditable) {
            node.childNodes.forEach(uwuifyTextContent);
        }
    }
}

function uwuifyDOM() {
    uwuifyTextContent(document.body);
}

const observer = new MutationObserver(() => {
    uwuifyTextContent(document.body);
});

export default definePlugin({
    name: "UwU",
    description: "Oh god no...",
    authors: [Devs.Zoid],
    start() {
        observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
        });
    },

    stop() {
        observer.disconnect();
    }
});
