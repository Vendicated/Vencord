/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const COLOR_PICKER_DATA_KEY = "vs-color-picker-latest" as const;
export const savedColors: number[] = [];

export enum RenderType {
    BLOCK,
    FOREGROUND,
    BACKGROUND,
    NONE
}

export const settings = definePluginSettings({
    colorPicker: {
        type: OptionType.BOOLEAN,
        description: "Enable color picker",
        default: true,
        restartNeeded: true
    },
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
            {
                label: "Disabled",
                value: RenderType.NONE
            }
        ]
    },
    isHexRequired: {
        type: OptionType.BOOLEAN,
        description: "Is # required in parsing hex",
        default: true,
        restartNeeded: true
    },
});

export enum ColorType {
    RGB,
    HEX,
    HSL
}

export const regex = [
    { reg: /(rgb\(\s*?\d+?\s*?,\s*?\d+?\s*?,\s*?\d+?\s*?\))/g, type: ColorType.RGB },
    { reg: /(hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\))/g, type: ColorType.HSL }
];
