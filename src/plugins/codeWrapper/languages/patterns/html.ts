/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const html: LanguagePattern = {
    name: "HTML",
    identifier: "html",
    extensions: [".html", ".htm", ".xhtml"],
    threshold: 3,
    patterns: [
        { pattern: /<!DOCTYPE\s+html>/i, weight: 4, description: "doctype" },
        { pattern: /<html[\s>]/i, weight: 3, description: "html tag" },
        { pattern: /<head[\s>]/i, weight: 2, description: "head tag" },
        { pattern: /<body[\s>]/i, weight: 2, description: "body tag" },
        { pattern: /<div[\s>]|<\/div>/, weight: 1, description: "div tag" },
        { pattern: /<span[\s>]|<\/span>/, weight: 1, description: "span tag" },
        { pattern: /<p[\s>]|<\/p>/, weight: 1, description: "p tag" },
        { pattern: /<a\s+href=/, weight: 2, description: "anchor" },
        { pattern: /<img\s+src=/, weight: 2, description: "image" },
        { pattern: /<script[\s>]|<\/script>/, weight: 2, description: "script tag" },
        { pattern: /<style[\s>]|<\/style>/, weight: 2, description: "style tag" },
        { pattern: /<link\s+/, weight: 2, description: "link tag" },
        { pattern: /<meta\s+/, weight: 2, description: "meta tag" },
        { pattern: /<form[\s>]|<\/form>/, weight: 2, description: "form tag" },
        { pattern: /<input[\s>]|<button[\s>]|<textarea[\s>]/, weight: 2, description: "form elements" },
        { pattern: /<table[\s>]|<tr[\s>]|<td[\s>]|<th[\s>]/, weight: 2, description: "table elements" },
        { pattern: /<ul[\s>]|<ol[\s>]|<li[\s>]/, weight: 1, description: "list elements" },
        { pattern: /<h[1-6][\s>]/, weight: 2, description: "heading tags" },
        { pattern: /class="[\w\s-]+"/, weight: 1, description: "class attribute" },
        { pattern: /id="[\w-]+"/, weight: 1, description: "id attribute" },
        { pattern: /<nav[\s>]|<header[\s>]|<footer[\s>]|<main[\s>]|<article[\s>]|<section[\s>]/, weight: 2, description: "semantic tags" },
        { pattern: /<!--[\s\S]*?-->/, weight: 1, description: "HTML comment" },
        { pattern: /data-[\w-]+="/, weight: 1, description: "data attribute" },
    ]
};
