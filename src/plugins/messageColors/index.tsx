/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addChatBarButton } from "@api/ChatButtons";
import { DataStore } from "@api/index";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";
import type { Message } from "discord-types/general";

import { ColorPickerChatButton } from "./ColorPicker";
import { CHAT_BUTTON_ID, COLOR_PICKER_DATA_KEY, ColorType, regex, RenderType, savedColors, settings } from "./constants";

const enum MessageTypes {
    DEFAULT = 0,
    REPLY = 19
}

export default definePlugin({
    authors: [Devs.hen],
    name: "MessageColors",
    description: "Displays color codes like #FF0042 inside of messages",
    settings,
    patches: [{
        find: ".VOICE_HANGOUT_INVITE?\"\"",
        replacement: {
            match: /(\?\i.\i.Messages.SOURCE_MESSAGE_DELETED:)\i/,
            replace: "$1$self.getColoredText(...arguments)"
        }
    }],
    async start() {
        regex.push({
            reg: settings.store.isHexRequired ?
                /(#(?:[0-9a-fA-F]{3}){1,2})/g : /(#?(?:[0-9a-fA-F]{3}){1,2})/g,
            type: ColorType.HEX
        });

        if (settings.store.colorPicker) {
            addChatBarButton(CHAT_BUTTON_ID, ColorPickerChatButton);
        }

        let colors = await DataStore.get(COLOR_PICKER_DATA_KEY);
        if (!colors) {
            colors = [
                1752220,
                3066993,
                3447003,
                10181046,
                15277667,
                15844367,
                15105570,
                15158332,
                9807270,
                6323595,

                1146986,
                2067276,
                2123412,
                7419530,
                11342935,
                12745742,
                11027200,
                10038562,
                9936031,
                5533306
            ];
        }

        savedColors.push(...colors);
    },

    getColoredText(message: Message, originalChildren: React.ReactElement[]) {
        if (settings.store.renderType === RenderType.NONE) return originalChildren;
        if (![MessageTypes.DEFAULT, MessageTypes.REPLY].includes(message.type)) return originalChildren;

        const hasColor = regex.some(({ reg }) => reg.test(message.content));

        if (!hasColor) return originalChildren;

        return <ColoredMessage children={originalChildren} />;
    }
});

function parseColor(str: string, type: ColorType): string {
    switch (type) {
        case ColorType.RGB:
            return str;
        case ColorType.HEX:
            return str[0] === "#" ? str : `#${str}`;
        case ColorType.HSL:
            return str;
    }
}


// https://en.wikipedia.org/wiki/Relative_luminance
const calcRGBLightness = (r: number, g: number, b: number) => {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const isColorDark = (color: string, type: ColorType): boolean => {
    switch (type) {
        case ColorType.RGB: {
            const match = color.match(/\d+/g)!;
            const lightness = calcRGBLightness(+match[0], +match[1], +match[2]);
            return lightness < 140;
        }
        case ColorType.HEX: {
            var rgb = parseInt(color.substring(1), 16);
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >> 8) & 0xff;
            const b = (rgb >> 0) & 0xff;
            const lightness = calcRGBLightness(r, g, b);
            return lightness < 140;
        }
        case ColorType.HSL: {
            const match = color.match(/\d+/g)!;
            const lightness = +match[2];
            return lightness < 50;
        }
    }
};

function ColoredMessage({ children }: { children: React.ReactElement[]; }) {
    let result: (string | React.ReactElement)[] = [];
    // Discord renders message as bunch of small span chunks
    // Mostly they are splitted by a space, which breaks rgb/hsl regex
    // Also mentions are nested react elements, so we don't want to affect them
    // Ignore everything except plain text and combine it
    for (let i = 0; i < children.length; i++) {
        const chunk = children[i];
        if (chunk.type !== "span") {
            result.push(chunk);
            continue;
        }
        if (typeof result[result.length - 1] !== "string") {
            result.push(chunk.props.children);
            continue;
        }

        result[result.length - 1] += chunk.props.children;
    }

    // Dynamic react element creation is a pain
    // I could just make inplace replace without this :(
    for (const { reg, type } of regex) {
        let temp: typeof result = [];
        for (const chunk of result) {
            if (typeof chunk !== "string") {
                temp.push(chunk);
                continue;
            }

            const parts: any[] = chunk.split(reg);
            const matches = chunk.match(reg)!;
            if (!matches) {
                temp.push(chunk);
                continue;
            }
            temp = parts.reduce((arr, element) => {
                if (!element || typeof element !== "string") return arr;

                if (!matches.includes(element))
                    return [...arr, element];
                const color = parseColor(element, type);

                if (settings.store.renderType === RenderType.FOREGROUND) {
                    return [...arr, <span style={{ color: color }}>{element}</span>];
                }
                const styles = {
                    "--color": color
                } as React.CSSProperties;

                if (settings.store.renderType === RenderType.BACKGROUND) {
                    const isDark = isColorDark(color, type);
                    const className = isDark ? "vc-color-bg" : "vc-color-bg vc-color-bg-light";
                    return [...arr, <span className={className} style={styles}>{element}</span>];
                }

                return [...arr, element, <span className="vc-color-block" style={styles}></span>];
            }, temp);
        }
        result = temp;
    }

    return <>{result}</>;
}
