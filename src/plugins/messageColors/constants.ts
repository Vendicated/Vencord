/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { ColorPickerChatButton } from "./ColorPicker";

export const COLOR_PICKER_DATA_KEY = "vc-color-picker-latest" as const;
export const CHAT_BUTTON_ID = "vc-color-picker" as const;
export const savedColors: number[] = [];

export const enum RenderType {
    BLOCK,
    FOREGROUND,
    BACKGROUND,
    NONE
}

export const settings = definePluginSettings({
    colorPicker: {
        type: OptionType.BOOLEAN,
        description: "Enable color picker",
        onChange(newValue) {
            if (newValue) {
                addChatBarButton(CHAT_BUTTON_ID, ColorPickerChatButton);
            } else {
                removeChatBarButton(CHAT_BUTTON_ID);
            }
        },
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
