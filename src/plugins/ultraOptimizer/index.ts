/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { managedStyleRootNode } from "@api/Styles";
import { createAndAppendStyle } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";

let style: HTMLStyleElement | undefined;

function buildCss() {
    const { disableBackdropBlur, disableTransitions, disableShadows } = settings.store;
    const rules: string[] = [];

    if (disableBackdropBlur) {
        // Frosted-glass effects re-blur what is behind them on every repaint.
        rules.push("backdrop-filter: none !important;");
    }
    if (disableTransitions) {
        rules.push("transition-duration: 0s !important;", "transition-delay: 0s !important;");
    }
    if (disableShadows) {
        rules.push("box-shadow: none !important;", "text-shadow: none !important;");
    }

    if (!rules.length) return "";
    return `*, *::before, *::after {\n    ${rules.join("\n    ")}\n}`;
}

function updateCss() {
    if (style) style.textContent = buildCss();
}

const settings = definePluginSettings({
    disableBackdropBlur: {
        type: OptionType.BOOLEAN,
        description: "Remove backdrop blur (frosted glass) effects. Low visual impact.",
        default: true,
        onChange: updateCss
    },
    disableTransitions: {
        type: OptionType.BOOLEAN,
        description: "Remove CSS transitions (hover fades, slides). UI feels snappier but less smooth. Loading spinners are not affected.",
        default: false,
        onChange: updateCss
    },
    disableShadows: {
        type: OptionType.BOOLEAN,
        description: "Remove box and text shadows. Flatter look; some focus/selection outlines drawn with shadows may disappear.",
        default: false,
        onChange: updateCss
    }
});

export default definePlugin({
    name: "UltraOptimizer",
    description: "Reduces avoidable rendering cost (blur, transitions, shadows). Every option can be toggled independently and is fully undone when the plugin is disabled.",
    tags: ["Appearance", "Utility"],
    authors: [{ name: "Jackfrost-cloud", id: 0n }],
    settings,

    start() {
        style = createAndAppendStyle("VcUltraOptimizer", managedStyleRootNode);
        updateCss();
    },

    stop() {
        style?.remove();
        style = undefined;
    }
});
