/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const enum RenderType {
    BLOCK,
    FOREGROUND,
    BACKGROUND,
}

export const enum BlockDisplayType {
    LEFT,
    RIGHT,
    BOTH,
}

export const settings = definePluginSettings({
    renderType: {
        type: OptionType.SELECT,
        description: "How to render colors",
        options: [
            {
                label: "Text color",
                value: RenderType.FOREGROUND,
                default: true,
            },
            {
                label: "Block nearby",
                value: RenderType.BLOCK,
            },
            {
                label: "Background color",
                value: RenderType.BACKGROUND,
            },
        ],
    },
    enableShortHexCodes: {
        type: OptionType.BOOLEAN,
        description: "Enable 3 char hex-code like #39f",
        default: true,
        // Regex are created on the start, so without restart nothing would change
        restartNeeded: true,
    },
    blockView: {
        type: OptionType.SELECT,
        disabled: () => settings.store.renderType !== RenderType.BLOCK,
        description: "Where to display colored block",
        options: [
            {
                label: "Right side",
                value: BlockDisplayType.RIGHT,
                default: true,
            },
            {
                label: "Left side",
                value: BlockDisplayType.LEFT,
            },
            {
                label: "Both sides",
                value: BlockDisplayType.BOTH,
            },
        ],
    },
});

export const enum ColorType {
    RGB,
    RGBA,
    HEX,
    HSL,
    OKLAB,
    OKLCH,
}

// It's sooo hard to read regex without this, it makes it at least somewhat bearable
export const replaceRegexp = (reg: string) => {
    const n = new RegExp(
        reg
            // \c - comma or whitespace separator
            // \v - 'value' (integer)
            // \f - 'float'
            // \p - number, percentage or none (OKLab/OKLCH)
            // \a - optional alpha (OKLab/OKLCH)
            // \A - required alpha value and its separator (RGBA)
            .replaceAll("\\A", "(?:\\c|\\s*/\\s*)\\f")
            .replaceAll("\\a", "(?:\\s*/\\s*\\p)?")
            .replaceAll("\\p", "(?:\\f%?|none)")
            .replaceAll("\\f", "[+-]?([0-9]*[.])?[0-9]+")
            .replaceAll("\\c", "(?:\\s*,\\s*|\\s+)")
            .replaceAll("\\v", "\\d+"),
        "g",
    );

    return n;
};

/* eslint-disable no-useless-escape -- \a and \A are expanded by replaceRegexp. */
export const regex = [
    { reg: /rgb\(\s*\v\c\v\c\v\s*\)/g, type: ColorType.RGB },
    { reg: /rgba\(\s*\v\c\v\c\v\A\s*\)/g, type: ColorType.RGBA },
    { reg: /hsl\(\s*\v°?\c\v%?\c\v%?\s*\)/g, type: ColorType.HSL },
    { reg: /oklab\(\s*\p\s+\p\s+\p\a\s*\)/g, type: ColorType.OKLAB },
    {
        reg: /oklch\(\s*\p\s+\p\s+(?:\f(?:deg|grad|rad|turn)?|none)\a\s*\)/g,
        type: ColorType.OKLCH,
    },
].map(v => {
    v.reg = replaceRegexp(v.reg.source);
    return v;
});
