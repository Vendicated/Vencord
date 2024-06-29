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
    }
});

export const enum ColorType {
    RGB,
    HEX,
    HSL
}

export const regex = [
    { reg: /rgb\(\s*?\d+?\s*?,\s*?\d+?\s*?,\s*?\d+?\s*?\)/g, type: ColorType.RGB },
    { reg: /hsl\(\s*\d+\s*°?,\s*\d+%\s*,\s*\d+%\s*\)/g, type: ColorType.HSL },
    { reg: /#(?:[0-9a-fA-F]{3}){1,2}/g, type: ColorType.HEX }
];
