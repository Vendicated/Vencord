/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { hexToHSL } from "./colorUtils";

const VARS_STYLE_ID = "vc-clientTheme-vars";
const OVERRIDES_STYLE_ID = "vc-clientTheme-overrides";

export function createOrUpdateThemeColorVars(color: string) {
    const { hue, saturation, lightness } = hexToHSL(color);

    createOrUpdateStyle(VARS_STYLE_ID, `:root {
        --theme-h: ${hue};
        --theme-s: ${saturation}%;
        --theme-l: ${lightness}%;
    }`);
}

export async function startClientTheme(color: string) {
    createOrUpdateThemeColorVars(color);
    createColorsOverrides(await getDiscordStyles());
}

export function disableClientTheme() {
    document.getElementById(VARS_STYLE_ID)?.remove();
    document.getElementById(OVERRIDES_STYLE_ID)?.remove();
}

function getOrCreateStyle(styleId: string) {
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
        return existingStyle as HTMLStyleElement;
    }

    const newStyle = document.createElement("style");
    newStyle.id = styleId;

    return document.head.appendChild(newStyle);
}

function createOrUpdateStyle(styleId: string, css: string) {
    const style = getOrCreateStyle(styleId);
    style.textContent = css;
}

/**
 * @returns A string containing all the CSS styles from the Discord client.
 */
async function getDiscordStyles(): Promise<string> {
    const styleLinkNodes = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');

    const cssTexts = await Promise.all(Array.from(styleLinkNodes, async node => {
        if (!node.href)
            return null;

        return fetch(node.href).then(res => res.text());
    }));

    return cssTexts.filter(Boolean).join("\n");
}

const VISUAL_REFRESH_COLORS_VARIABLES_REGEX = /(--neutral-\d{1,3}?-hsl):.+?([\d.]+?)%;/g;

function createColorsOverrides(styles: string) {
    const visualRefreshColorsLightness = {} as Record<string, number>;

    for (const [, colorVariableName, lightness] of styles.matchAll(VISUAL_REFRESH_COLORS_VARIABLES_REGEX)) {
        visualRefreshColorsLightness[colorVariableName] = parseFloat(lightness);
    }

    const lightThemeBaseLightness = visualRefreshColorsLightness["--neutral-2-hsl"];
    const darkThemeBaseLightness = visualRefreshColorsLightness["--neutral-69-hsl"];

    createOrUpdateStyle(OVERRIDES_STYLE_ID, [
        `.theme-light {\n ${generateNewColorVars(visualRefreshColorsLightness, lightThemeBaseLightness)} \n}`,
        `.theme-dark {\n ${generateNewColorVars(visualRefreshColorsLightness, darkThemeBaseLightness)} \n}`,
    ].join("\n\n"));
}

function generateNewColorVars(colorsLightess: Record<string, number>, baseLightness: number) {
    return Object.entries(colorsLightess).map(([colorVariableName, lightness]) => {
        const lightnessOffset = lightness - baseLightness;
        const plusOrMinus = lightnessOffset >= 0 ? "+" : "-";

        return `${colorVariableName}: var(--theme-h) var(--theme-s) calc(var(--theme-l) ${plusOrMinus} ${Math.abs(lightnessOffset).toFixed(2)}%);`;
    }).join("\n");
}
