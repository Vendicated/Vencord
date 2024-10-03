/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Styles } from "@api/index";
import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { createStyle } from "plugins/clientTheme";

export default definePlugin({
    name: "Fix hardcoded colors",
    description: "replace hardcoded colors with color variables",
    authors: [Devs.F53],
    startAt: StartAt.Init,
    dependencies: ["StyleListenerAPI"],

    async start() {
        let colorVariables: ColorVariable[];
        const stylesToParse: string[] = [];
        const fixes = createStyle("hardcodedColorFixes");
        Styles.styleListeners.add((styles, initial) => {
            // we can't generate fixes before getting colorVariables from the initial stylesheet
            if (colorVariables) // gen fixes if we already have colorVariables
                return fixes.innerText += generateFixes(colorVariables, styles);
            else // queue fix generation if we don't have colorVariables
                stylesToParse.push(styles);

            if (!initial) return;

            colorVariables = getColorVariables(styles);
            while (stylesToParse.length > 0) // gen fixes for queue now that we have them (and remove them from memory)
                fixes.innerText += generateFixes(colorVariables, stylesToParse.shift()!);
        });
    },
    stop() {
        document.getElementById("hardcodedColorFixes")?.remove();
    }
});

function generateFixes(colorVariables: ColorVariable[], styles: string) {
    const stylesToFix = getStylesWithColors(styles);
    let out = "";
    for (const style of stylesToFix)
        out += generateFix(colorVariables, style);
    return out;
}

function generateFix(colorVariables: ColorVariable[], problematicStyle: string) {
    const selector = /^[^{]*/.exec(problematicStyle)?.[0];
    const rules = Array.from(problematicStyle.matchAll(/(?:{|;)([a-z-]+):([^;}]+)/g), match => ({ property: match[1], value: match[2] }));
    if (!selector) return "";

    const fixes: string[] = [];
    for (const rule of rules) {
        let fixedValue = rule.value;
        for (const match of Array.from(rule.value.matchAll(/#[a-f\d]{6}|rgb\(\d+,\d+\d+\)/g))) {
            const rgb = toRGB(match[0]);
            for (const color of colorVariables) {
                const distance = rgb.reduce((totalDistance, b, i) => totalDistance + Math.abs(b - color.rgb[i]), 0);
                if (distance > 5) continue;

                fixedValue = fixedValue.replaceAll(match[0], ` var(${color.variable}) `);
                break; // already found variable to replace it, don't keep looking
            }
        }
        fixedValue.replaceAll("  ", "");
        if (fixedValue !== rule.value)
            fixes.push(`${rule.property}:${fixedValue}`);
    }
    if (fixes.length === 0) return "";

    return `${selector}{${fixes.join(";")}}`;
}

const cssWithColorRegex = /(?:^|})[^{}]+?{[^}]*?(?:#[a-f\d]{6}|rgb\(\d+,\d+,\d+\))[^}]*?}/g;
// gets array of styles that hardcode color
function getStylesWithColors(styles: string) {
    return Array.from(styles.matchAll(cssWithColorRegex), match => {
        if (match[0][0] === "}") return match[0].slice(1);
        return match[0];
    });
}

const variableRegex = /(--[a-z-\d]*?)-hsl:(\d+).*?(\d+\.?\d*)%.*?(\d+\.?\d*)%/g;
interface ColorVariable { variable: string, rgb: [number, number, number]; }
function getColorVariables(styles: string): ColorVariable[] {
    return Array.from(styles.matchAll(variableRegex), match => {
        const variable = match[1];
        const [h, s, l] = match.slice(2);
        return { variable, rgb: toRGB(`hsl(${h},${s}%,${l}%)`) };
    }).filter(color => // ignore solid white/black colors because they are weird
        color.rgb.some(b => b !== 255) && color.rgb.some(b => b !== 0)
    ).toSorted(a => // prefer --primary colors over anything else
        a.variable.startsWith("--primary") ? -1 : 0
    );
}

function toRGB(color: string) {
    // https://stackoverflow.com/a/74662179/8133370
    const { style } = new Option();
    style.color = color; // for some reason this is immediately translated into "rgb(x, x, x)", no matter the input
    // turn into array [r: number, g: number, b: number]
    return Array.from(style.color.matchAll(/\b\d+\b/g)).flatMap(Number) as [number, number, number];
}
