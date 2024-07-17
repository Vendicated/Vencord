/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// returns all of discord's native styles in a single string
// ! discord lazy loads css chunks, make sure to use newStyleListener as well
export async function getStyles(): Promise<string> {
    const out = "";
    const styleLinkNodes: NodeListOf<HTMLLinkElement> = document.querySelectorAll('link[rel="stylesheet"]');
    return Promise.all(Array.from(styleLinkNodes, n => parseStyleLinkNode(n)))
        .then(contents => contents.join("\n"));
}

// runs callback with styles of new style nodes added to the head
export function newStyleListener(callback: (styles: string) => void) {
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLLinkElement) || node.rel !== "stylesheet")
                    continue;

                parseStyleLinkNode(node).then(callback);
            }
        }
    });

    observer.observe(document.head, { childList: true });
}

async function parseStyleLinkNode(node: HTMLLinkElement): Promise<string> {
    const link = node.getAttribute("href");
    if (!link) return "";

    return fetch(link)
        .then(res => res.text())
        .catch(() => "");
}

