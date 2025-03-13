/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./clientTheme.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { findByCodeLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Button, Forms, ThemeStore, useStateFromStores } from "@webpack/common";

const cl = classNameFactory("vc-clientTheme-");

const ColorPicker = findComponentByCodeLazy("#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}", ".BACKGROUND_PRIMARY)");

const colorPresets = [
    "#1E1514", "#172019", "#13171B", "#1C1C28", "#402D2D",
    "#3A483D", "#344242", "#313D4B", "#2D2F47", "#322B42",
    "#3C2E42", "#422938", "#b6908f", "#bfa088", "#d3c77d",
    "#86ac86", "#88aab3", "#8693b5", "#8a89ba", "#ad94bb",
];

function onPickColor(color: number) {
    const hexColor = color.toString(16).padStart(6, "0");

    settings.store.color = hexColor;
    updateColorVars(hexColor);
}

const saveClientTheme = findByCodeLazy('type:"UNSYNCED_USER_SETTINGS_UPDATE', '"system"===');

function setTheme(theme: string) {
    saveClientTheme({ theme });
}

const NitroThemeStore = findStoreLazy("ClientThemesBackgroundStore");

function ThemeSettings() {
    const theme = useStateFromStores([ThemeStore], () => ThemeStore.theme);
    const isLightTheme = theme === "light";
    const oppositeTheme = isLightTheme ? "dark" : "light";

    const nitroTheme = useStateFromStores([NitroThemeStore], () => NitroThemeStore.gradientPreset);
    const nitroThemeEnabled = nitroTheme !== undefined;

    const selectedLuminance = relativeLuminance(settings.store.color);

    let contrastWarning = false, fixableContrast = true;
    if ((isLightTheme && selectedLuminance < 0.26) || !isLightTheme && selectedLuminance > 0.12)
        contrastWarning = true;
    if (selectedLuminance < 0.26 && selectedLuminance > 0.12)
        fixableContrast = false;
    // light mode with values greater than 65 leads to background colors getting crushed together and poor text contrast for muted channels
    if (isLightTheme && selectedLuminance > 0.65) {
        contrastWarning = true;
        fixableContrast = false;
    }

    return (
        <div className={cl("settings")}>
            <div className={cl("container")}>
                <div className={cl("settings-labels")}>
                    <Forms.FormTitle tag="h3">Theme Color</Forms.FormTitle>
                    <Forms.FormText>Add a color to your Discord client theme</Forms.FormText>
                </div>
                <ColorPicker
                    color={parseInt(settings.store.color, 16)}
                    onChange={onPickColor}
                    showEyeDropper={false}
                    suggestedColors={colorPresets}
                />
            </div>
            {(contrastWarning || nitroThemeEnabled) && (<>
                <Forms.FormDivider className={classes(Margins.top8, Margins.bottom8)} />
                <div className={`client-theme-contrast-warning ${contrastWarning ? (isLightTheme ? "theme-dark" : "theme-light") : ""}`}>
                    <div className={cl("warning")}>
                        <Forms.FormText className={cl("warning-text")}>Warning, your theme won't look good:</Forms.FormText>
                        {contrastWarning && <Forms.FormText className={cl("warning-text")}>Selected color won't contrast well with text</Forms.FormText>}
                        {nitroThemeEnabled && <Forms.FormText className={cl("warning-text")}>Nitro themes aren't supported</Forms.FormText>}
                    </div>
                    {(contrastWarning && fixableContrast) && <Button onClick={() => setTheme(oppositeTheme)} color={Button.Colors.RED}>Switch to {oppositeTheme} mode</Button>}
                    {(nitroThemeEnabled) && <Button onClick={() => setTheme(theme)} color={Button.Colors.RED}>Disable Nitro Theme</Button>}
                </div>
            </>)}
        </div>
    );
}

const settings = definePluginSettings({
    color: {
        type: OptionType.COMPONENT,
        default: "313338",
        component: ThemeSettings
    },
    resetColor: {
        type: OptionType.COMPONENT,
        component: () => (
            <Button onClick={() => onPickColor(0x313338)}>
                Reset Theme Color
            </Button>
        )
    }
});

export default definePlugin({
    name: "ClientTheme",
    authors: [Devs.Nuckyz],
    description: "Recreation of the old client theme experiment. Add a color to your Discord client theme",
    settings,

    startAt: StartAt.DOMContentLoaded,
    async start() {
        updateColorVars(settings.store.color);

        const styles = await getStyles();
        generateColorOffsets(styles);
        generateLightModeFixes(styles);
    },

    stop() {
        document.getElementById("clientThemeVars")?.remove();
        document.getElementById("clientThemeOffsets")?.remove();
        document.getElementById("clientThemeLightModeFixes")?.remove();
    }
});

const variableRegex = /(--primary-\d{3}-hsl):.*?(\S*)%;/g;
const lightVariableRegex = /^--primary-[1-5]\d{2}-hsl/g;
const darkVariableRegex = /^--primary-[5-9]\d{2}-hsl/g;

// generates variables per theme by:
// - matching regex (so we can limit what variables are included in light/dark theme, otherwise text becomes unreadable)
// - offset from specified center (light/dark theme get different offsets because light uses 100 for background-primary, while dark uses 600)
function genThemeSpecificOffsets(variableLightness: Record<string, number>, regex: RegExp, centerVariable: string): string {
    return Object.entries(variableLightness).filter(([key]) => key.search(regex) > -1)
        .map(([key, lightness]) => {
            const lightnessOffset = lightness - variableLightness[centerVariable];
            const plusOrMinus = lightnessOffset >= 0 ? "+" : "-";
            return `${key}: var(--theme-h) var(--theme-s) calc(var(--theme-l) ${plusOrMinus} ${Math.abs(lightnessOffset).toFixed(2)}%);`;
        })
        .join("\n");
}


function generateColorOffsets(styles) {
    const variableLightness = {} as Record<string, number>;

    // Get lightness values of --primary variables
    let variableMatch = variableRegex.exec(styles);
    while (variableMatch !== null) {
        const [, variable, lightness] = variableMatch;
        variableLightness[variable] = parseFloat(lightness);
        variableMatch = variableRegex.exec(styles);
    }

    createStyleSheet("clientThemeOffsets", [
        `.theme-light {\n ${genThemeSpecificOffsets(variableLightness, lightVariableRegex, "--primary-345-hsl")} \n}`,
        `.theme-dark {\n ${genThemeSpecificOffsets(variableLightness, darkVariableRegex, "--primary-600-hsl")} \n}`,
    ].join("\n\n"));
}

function generateLightModeFixes(styles) {
    const groupLightUsesW500Regex = /\.theme-light[^{]*\{[^}]*var\(--white-500\)[^}]*}/gm;
    // get light capturing groups that mention --white-500
    const relevantStyles = [...styles.matchAll(groupLightUsesW500Regex)].flat();

    const groupBackgroundRegex = /^([^{]*)\{background:var\(--white-500\)/m;
    const groupBackgroundColorRegex = /^([^{]*)\{background-color:var\(--white-500\)/m;
    // find all capturing groups that assign background or background-color directly to w500
    const backgroundGroups = mapReject(relevantStyles, entry => captureOne(entry, groupBackgroundRegex)).join(",\n");
    const backgroundColorGroups = mapReject(relevantStyles, entry => captureOne(entry, groupBackgroundColorRegex)).join(",\n");
    // create css to reassign them to --primary-100
    const reassignBackgrounds = `${backgroundGroups} {\n background: var(--primary-100) \n}`;
    const reassignBackgroundColors = `${backgroundColorGroups} {\n background-color: var(--primary-100) \n}`;

    const groupBgVarRegex = /\.theme-light\{([^}]*--[^:}]*(?:background|bg)[^:}]*:var\(--white-500\)[^}]*)\}/m;
    const bgVarRegex = /^(--[^:]*(?:background|bg)[^:]*):var\(--white-500\)/m;
    // get all global variables used for backgrounds
    const lightVars = mapReject(relevantStyles, style => captureOne(style, groupBgVarRegex)) // get the insides of capture groups that have at least one background var with w500
        .map(str => str.split(";")).flat(); // captureGroupInsides[] -> cssRule[]
    const lightBgVars = mapReject(lightVars, variable => captureOne(variable, bgVarRegex)); // remove vars that aren't for backgrounds or w500
    // create css to reassign every var
    const reassignVariables = `.theme-light {\n ${lightBgVars.map(variable => `${variable}: var(--primary-100);`).join("\n")} \n}`;

    createStyleSheet("clientThemeLightModeFixes", [
        reassignBackgrounds,
        reassignBackgroundColors,
        reassignVariables,
    ].join("\n\n"));
}

function captureOne(str, regex) {
    const result = str.match(regex);
    return (result === null) ? null : result[1];
}

function mapReject(arr, mapFunc) {
    return arr.map(mapFunc).filter(Boolean);
}

function updateColorVars(color: string) {
    const { hue, saturation, lightness } = hexToHSL(color);

    let style = document.getElementById("clientThemeVars");
    if (!style)
        style = createStyleSheet("clientThemeVars");

    style.textContent = `:root {
        --theme-h: ${hue};
        --theme-s: ${saturation}%;
        --theme-l: ${lightness}%;
    }`;
}

function createStyleSheet(id, content = "") {
    const style = document.createElement("style");
    style.setAttribute("id", id);
    style.textContent = content.split("\n").map(line => line.trim()).join("\n");
    document.body.appendChild(style);
    return style;
}

// returns all of discord's native styles in a single string
async function getStyles(): Promise<string> {
    let out = "";
    const styleLinkNodes = document.querySelectorAll('link[rel="stylesheet"]');
    for (const styleLinkNode of styleLinkNodes) {
        const cssLink = styleLinkNode.getAttribute("href");
        if (!cssLink) continue;

        const res = await fetch(cssLink);
        out += await res.text();
    }
    return out;
}

// https://css-tricks.com/converting-color-spaces-in-javascript/
function hexToHSL(hexCode: string) {
    // Hex => RGB normalized to 0-1
    const r = parseInt(hexCode.substring(0, 2), 16) / 255;
    const g = parseInt(hexCode.substring(2, 4), 16) / 255;
    const b = parseInt(hexCode.substring(4, 6), 16) / 255;

    // RGB => HSL
    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);
    const delta = cMax - cMin;

    let hue: number, saturation: number, lightness: number;

    lightness = (cMax + cMin) / 2;

    if (delta === 0) {
        // If r=g=b then the only thing that matters is lightness
        hue = 0;
        saturation = 0;
    } else {
        // Magic
        saturation = delta / (1 - Math.abs(2 * lightness - 1));

        if (cMax === r)
            hue = ((g - b) / delta) % 6;
        else if (cMax === g)
            hue = (b - r) / delta + 2;
        else
            hue = (r - g) / delta + 4;
        hue *= 60;
        if (hue < 0)
            hue += 360;
    }

    // Move saturation and lightness from 0-1 to 0-100
    saturation *= 100;
    lightness *= 100;

    return { hue, saturation, lightness };
}

// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function relativeLuminance(hexCode: string) {
    const normalize = (x: number) =>
        x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;

    const r = normalize(parseInt(hexCode.substring(0, 2), 16) / 255);
    const g = normalize(parseInt(hexCode.substring(2, 4), 16) / 255);
    const b = normalize(parseInt(hexCode.substring(4, 6), 16) / 255);

    return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
