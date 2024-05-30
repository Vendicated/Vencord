/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addChatBarButton } from "@api/ChatButtons";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";
import type { Message } from "discord-types/general";

import { ColorPickerChatButton } from "./ColorPicker";
import { COLOR_PICKER_DATA_KEY, regex, savedColors } from "./constants";

enum RenderType {
    BLOCK,
    FOREGROUND,
    BACKGROUND,
    NONE
}

const settings = definePluginSettings({
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
});

export default definePlugin({
    authors: [Devs.hen],
    name: "MessageColors",
    description: "Displays hex/rgb/hsl colors inside of a message",
    settings,
    patches: [{
        find: "memoizeMessageProps:",
        replacement: {
            match: /function (\i)\((\i),(\i)\){return (.+?)(\i)}/,
            replace: "function $1($2,$3){return $4$self.getColoredText($2,$3)}"
        }
    }],
    async start() {
        if (!settings.store.colorPicker) return;

        addChatBarButton("vc-color-picker", ColorPickerChatButton);
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
        if (![0, 19].includes(message.type)) return originalChildren;

        let hasColor = false;
        for (const reg of regex) {
            if (reg.test(message.content)) {
                hasColor = true;
                break;
            }
        }
        if (!hasColor) return originalChildren;

        return <ColoredMessage ch={originalChildren} />;
    }
});

function ColoredMessage({ ch }: { ch: React.ReactElement[]; }) {
    let result: (string | React.ReactElement)[] = [];
    // I hate discord
    // I need this to avoid breaking mentions
    for (let i = 0; i < ch.length; i++) {
        const chunk = ch[i];
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
    for (const reg of regex) {
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

                if (settings.store.renderType === RenderType.BACKGROUND)
                    return [...arr, <span style={{ background: element }}>{element}</span>];
                if (settings.store.renderType === RenderType.FOREGROUND)
                    return [...arr, <span style={{ color: element }}>{element}</span>];

                const styles = {
                    "--color": element
                } as React.CSSProperties;

                return [...arr, element, <span className="vc-color-block" style={styles}></span>];
            }, temp);
        }
        result = temp;
    }

    return <>{result}</>;
}
