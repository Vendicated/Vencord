/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// returns all of discord's native styles in a single string
// ! discord lazy loads css chunks, make sure to use newStyleListener as well
export async function getStyles(): Promise<string> {
    let out = "";
    const styleLinkNodes: NodeListOf<HTMLLinkElement> = document.querySelectorAll('link[rel="stylesheet"]');
    for (const styleLinkNode of styleLinkNodes)
        out += await parseStyleLinkNode(styleLinkNode);
    return out;
}

// runs callback with styles of new style nodes added to the head
export function newStyleListener(callback: (styles: string) => void) {
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLLinkElement) || node.rel !== "stylesheet")
                    continue;
                // TODO: remove before committing
                console.log(`NEW STYLESHEET!!!! ${node.href}`, node);

                parseStyleLinkNode(node).then(callback);
            }
        }
    });

    observer.observe(document.head, { childList: true });
}

async function parseStyleLinkNode(node: HTMLLinkElement): Promise<string> {
    const link = node.getAttribute("href");
    if (!link) return "";

    try {
        const res = await fetch(link);
        return await res.text();
    } catch (error) {
        return "";
    }
}

