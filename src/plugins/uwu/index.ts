/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

function uwuify(text) {
    return text
        .replace(/r/g, 'w')
        .replace(/l/g, 'w')
        .replace(/R/g, 'W')
        .replace(/L/g, 'W')
        .replace(/n([aeiou])/gi, 'ny$1')
        .replace(/ove/g, 'uv');
}

function uwuifyTextContent(node) {
    if (node.nodeType === 3) {
        node.nodeValue = uwuify(node.nodeValue);
    } else if (node.nodeType === 1 && node.childNodes) {
        node.childNodes.forEach(uwuifyTextContent);
    }
}

function uwuifyDOM() {
    uwuifyTextContent(document.body);
}

let uwuInterval: any = null;

export default definePlugin({
    name: "UwU",
    description: "Oh god no...",
    authors: [Devs.Zoid],
    start() {
        if (!uwuInterval) {
            uwuInterval = setInterval(uwuifyDOM, 500);
        }
    },

    stop() {
        if (uwuInterval) {
            clearInterval(uwuInterval);
            uwuInterval = null;
        }
    }
});
