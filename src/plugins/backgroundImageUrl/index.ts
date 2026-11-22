/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Rayyan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { managedStyleRootNode } from "@api/Styles";
import { Devs } from "@utils/constants";
import { createAndAppendStyle } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";

let style: HTMLStyleElement | null = null;

const settings = definePluginSettings({
    backgroundUrl: {
        type: OptionType.STRING,
        description: "Direct HTTP(S) image URL to use as your theme background.",
        default: "",
        placeholder: "https://example.com/image.jpg",
        onChange: updateStyle
    },
    cssVariable: {
        type: OptionType.STRING,
        description: "CSS custom property your theme uses for its background image.",
        default: "--background-image-url",
        placeholder: "--background-image-url",
        onChange: updateStyle
    }
});

function updateStyle() {
    if (!style) return;

    const variable = settings.store.cssVariable.trim();
    const value = settings.store.backgroundUrl.trim();
    if (!/^--[a-zA-Z_][a-zA-Z0-9_-]*$/.test(variable) || !value) {
        style.textContent = "";
        return;
    }

    try {
        const url = new URL(value);
        if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
            style.textContent = "";
            return;
        }

        style.textContent = `body { ${variable}: url("${url.href}") !important; }`;
    } catch {
        style.textContent = "";
    }
}

export default definePlugin({
    name: "BackgroundImageURL",
    description: "Change a theme background image using a CSS custom property.",
    authors: [Devs.Rayyan],
    tags: ["Appearance"],
    searchTerms: ["theme background image URL"],
    settings,

    start() {
        style = createAndAppendStyle("BackgroundImageURL", managedStyleRootNode);
        updateStyle();
    },

    stop() {
        style?.remove();
        style = null;
    }
});
