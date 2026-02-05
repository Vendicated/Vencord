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
    BOTH
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
                value: RenderType.BACKGROUND
            },
        ]
    },
    enableShortHexCodes: {
        type: OptionType.BOOLEAN,
        description: "Enable 3 char hex-code like #39f",
        default: true,
        // Regex are created on the start, so without restart nothing would change
        restartNeeded: true
    },
    blockView: {
        type: OptionType.SELECT,
        disabled: () => settings.store.renderType !== RenderType.BLOCK,
        description: "Where to display colored block",
        options: [
            {
                label: "Right side",
                value: BlockDisplayType.RIGHT,
                default: true
            },
            {
                label: "Left side",
                value: BlockDisplayType.LEFT
            },
            {
                label: "Both sides",
                value: BlockDisplayType.BOTH
            }
        ]
    }
});

export const enum ColorType {
    RGB,
    RGBA,
    HEX,
    HSL
}

// It's sooo hard to read regex without this, it makes it at least somewhat bearable
export const replaceRegexp = (reg: string) => {
    const n = new RegExp(reg
        // \c - 'comma'
        // \v - 'value'
        // \f - 'float'
        .replaceAll("\\f", "[+-]?([0-9]*[.])?[0-9]+")
        .replaceAll("\\c", "(?:,|\\s)")
        .replaceAll("\\v", "\\s*?\\d+?\\s*?"), "g");

    return n;
};

export const regex = [
    { reg: /rgb\(\v\c\v\c\v\)/g, type: ColorType.RGB },
    { reg: /rgba\(\v\c\v\c\v(\c|\/?)\s*\f\)/g, type: ColorType.RGBA },
    { reg: /hsl\(\v°?\c\s*?\d+%?\s*?\c\s*?\d+%?\s*?\)/g, type: ColorType.HSL },
].map(v => { v.reg = replaceRegexp(v.reg.source); return v; });
