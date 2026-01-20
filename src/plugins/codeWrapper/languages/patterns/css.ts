/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const css: LanguagePattern = {
    name: "CSS",
    identifier: "css",
    extensions: [".css"],
    threshold: 3,
    patterns: [
        { pattern: /[\w.#\[\]-]+\s*{\s*[\s\S]*?}/, weight: 2, description: "selector block" },
        { pattern: /\.[a-zA-Z][\w-]*\s*{/, weight: 2, description: "class selector" },
        { pattern: /#[a-zA-Z][\w-]*\s*{/, weight: 2, description: "id selector" },
        { pattern: /\[\w+[~|^$*]?=["']?[\w]+["']?\]/, weight: 2, description: "attribute selector" },
        { pattern: /(margin|padding|border|width|height)\s*:/, weight: 1, description: "box model" },
        { pattern: /(color|background|font|text-align)\s*:/, weight: 1, description: "common properties" },
        { pattern: /display\s*:\s*(flex|grid|block|inline|none)/, weight: 2, description: "display property" },
        { pattern: /position\s*:\s*(absolute|relative|fixed|sticky)/, weight: 2, description: "position property" },
        { pattern: /:\s*#[0-9a-fA-F]{3,8}\b/, weight: 2, description: "hex color" },
        { pattern: /:\s*rgb(a)?\s*\(/, weight: 2, description: "rgb color" },
        { pattern: /:\s*\d+(px|em|rem|%|vh|vw)\b/, weight: 2, description: "units" },
        { pattern: /::?(before|after|hover|focus|active|first-child)/, weight: 2, description: "pseudo" },
        { pattern: /@media\s*\(/, weight: 3, description: "media query" },
        { pattern: /@keyframes\s+\w+/, weight: 3, description: "keyframes" },
        { pattern: /@import\s+/, weight: 2, description: "import" },
        { pattern: /@font-face\s*{/, weight: 3, description: "font-face" },
        { pattern: /animation\s*:|transition\s*:/, weight: 2, description: "animation/transition" },
        { pattern: /transform\s*:\s*(translate|rotate|scale)/, weight: 2, description: "transform" },
        { pattern: /flex(-direction|-wrap|-grow|-shrink|-basis)?\s*:/, weight: 2, description: "flex properties" },
        { pattern: /grid(-template|-column|-row|-gap)?\s*:/, weight: 2, description: "grid properties" },
        { pattern: /var\(--[\w-]+\)/, weight: 2, description: "CSS variable" },
        { pattern: /--[\w-]+\s*:/, weight: 2, description: "CSS custom property" },
        { pattern: /!important/, weight: 1, description: "important" },
        { pattern: /\/\*[\s\S]*?\*\//, weight: 1, description: "CSS comment" },
    ]
};
