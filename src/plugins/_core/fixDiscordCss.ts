/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { StartAt } from "@utils/types";

let observer: MutationObserver;

function cleanSheet(sheet: CSSStyleSheet) {
    try {
        const rules = sheet.cssRules;
        if (!rules) return;

        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];

            if ((rule as CSSStyleRule).selectorText?.includes(":has(.gameOption_")) {
                new Logger("FixDiscordCss").info("Removed problematic CSS rule", rule.cssText);
                sheet.deleteRule(i);
                observer.disconnect();
                break;
            }
        }
    } catch (e) { }
}

function handleNode(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE || !(node as HTMLElement).matches('link[rel="stylesheet"]')) return;

    const linkNode = node as HTMLLinkElement;

    if (linkNode.sheet) {
        cleanSheet(linkNode.sheet);
    } else {
        node.addEventListener("load", () => cleanSheet(linkNode.sheet!), { once: true });
    }
}

export default definePlugin({
    name: "FixDiscordCss",
    description: "Fixes Discord's css lag",
    authors: [Devs.Ven],
    required: true,

    startAt: StartAt.DOMContentLoaded,

    start() {
        observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                m.addedNodes.forEach(handleNode);
            }
        });
        observer.observe(document.head, { childList: true });
    }
});
