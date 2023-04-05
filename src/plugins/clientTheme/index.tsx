/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import "./clientTheme.css";

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button } from "@webpack/common";

let ColorPicker: React.ComponentType<any> = () => null;

const colorPresets = [
    "#1E1514", "#172019", "#13171B", "#1C1C28", "#402D2D",
    "#3A483D", "#344242", "#313D4B", "#2D2F47", "#322B42",
    "#3C2E42", "#422938"
];

function onPickColor(color) {
    let hexColor = color.toString(16);
    while (hexColor.length < 6) {
        hexColor = "0" + hexColor;
    }
    settings.store.color = hexColor;
    updateColorVars();
}

function ThemeSettings() {
    const lightnessWarning = hexToLightness(settings.store.color) > 45;
    const lightModeWarning = document.querySelector("html")?.classList.contains("theme-light");

    return <div className="client-theme-settings">
        <div className="client-theme-container">
            <div className="client-theme-settings-labels">
                <h2>Theme Color</h2>
                <span>Add a color to your Discord client theme</span>
            </div>
            <ColorPicker
                color={parseInt(settings.store.color, 16)}
                onChange={onPickColor}
                showEyeDropper={false}
                suggestedColors={colorPresets}
            />
        </div>
        {lightnessWarning && <span className="client-theme-warning">Selected color is very light, will look dogshit</span>}
        {lightModeWarning && <span className="client-theme-warning">Light mode isn't supported, will look dogshit</span>}
    </div>;
}

const settings = definePluginSettings({
    color: {
        description: "Color your Discord client theme will be based around, light mode isn't supported",
        type: OptionType.COMPONENT,
        default: "313338",
        component: () => <ThemeSettings />
    },
    resetColor: {
        description: "Reset theme color",
        type: OptionType.COMPONENT,
        default: "313338",
        component: () => <Button onClick={() => { settings.store.color = "313338"; updateColorVars(); }}>
            Reset theme color
        </Button>
    }
});

export default definePlugin({
    name: "ClientTheme",
    authors: [Devs.F53],
    description: "Recreation of the old client theme experiment. Add a color to your Discord client theme",
    settings,
    patches: [
        {
            find: ".colorPickerFooter",
            replacement: {
                match: /function (\i).{0,200}\.colorPickerFooter/,
                replace: "$self.ColorPicker=$1;$&"
            }
        }
    ],

    set ColorPicker(e: any) {
        ColorPicker = e;
    },

    start() {
        updateColorVars();
        generateColorOffsets();
    },
    stop() {
        document.querySelector("style#clientThemeOffsets")?.remove();
        document.querySelector("style#clientThemeVars")?.remove();
    }
});


async function generateColorOffsets() {
    // get the CSS
    const styleLinkNode = document.head.querySelector('link[rel="stylesheet"]');
    if (!styleLinkNode) return console.error("Failed to get stylesheet for clientTheme");
    const cssLink = styleLinkNode.getAttribute("href");
    if (!cssLink) return;
    const resp = await fetch(cssLink);
    const cssString = await resp.text();

    // get lightness values of --primary variables >=500
    const variableRegex = /(--primary-([5-9]\d{2})-hsl:).*?(\S*)%;/g;
    let variableMatch = variableRegex.exec(cssString);
    const variableLightness = {};
    while (variableMatch !== null) {
        const [, variable, , lightness] = variableMatch;
        variableLightness[variable] = parseFloat(lightness);
        variableMatch = variableRegex.exec(cssString);
    }

    // generate offsets
    const lightnessOffsets = Object.keys(variableLightness).map(key => {
        const lightness = variableLightness[key];
        const lightnessOffset = lightness - variableLightness["--primary-600-hsl:"];
        const plusOrMinus = lightnessOffset >= 0 ? "+" : "-";
        return `${key} var(--theme-h) var(--theme-s) calc(var(--theme-l) ${plusOrMinus} ${Math.abs(lightnessOffset).toFixed(2)}%);`;
    }).join("\n");

    // add to the document
    const style = document.createElement("style");
    style.setAttribute("id", "clientThemeOffsets");
    style.textContent = `:root:root {
        ${lightnessOffsets}
    }`;
    document.head.appendChild(style);
}


function updateColorVars() {
    // get HSL values for current color
    const { hue, saturation, lightness } = hexToHSL(settings.store.color);
    console.log(hue, saturation, lightness);

    // find/create style node
    let style = document.querySelector("style#clientThemeVars");
    if (!style) {
        style = document.createElement("style");
        style.setAttribute("id", "clientThemeVars");
        document.head.appendChild(style);
    }

    // update its content
    style.textContent = `:root {
        --theme-h: ${hue};
        --theme-s: ${saturation}%;
        --theme-l: ${lightness}%;
    }`;
}


// https://css-tricks.com/converting-color-spaces-in-javascript/
function hexToHSL(hexCode) {
    // hex => rgb normalized to 0-1
    const r = parseInt(hexCode.substring(0, 2), 16) / 255;
    const g = parseInt(hexCode.substring(2, 4), 16) / 255;
    const b = parseInt(hexCode.substring(4, 6), 16) / 255;

    // rgb => hsl
    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);
    const delta = cMax - cMin;

    let hue, saturation, lightness;

    lightness = (cMax + cMin) / 2;

    if (delta === 0) {
        // if r=g=b then the only thing that matters is lightness
        hue = 0;
        saturation = 0;
    } else {
        // Magic bullshit
        saturation = delta / (1 - Math.abs(2 * lightness - 1));

        if (cMax === r)
            hue = ((g - b) / delta) % 6;
        else if (cMax === g)
            hue = (b - r) / delta + 2;
        else
            hue = (r - g) / delta + 4;
        hue *= 60;
        if (hue < 0) hue += 360;
    }

    // move saturation and lightness from 0-1 to 0-100
    saturation *= 100;
    lightness *= 100;

    return { hue, saturation, lightness };
}


// Minimized math just for lightness, lowers lag when changing colors
function hexToLightness(hexCode) {
    // hex => rgb normalized to 0-1
    const r = parseInt(hexCode.substring(0, 2), 16) / 255;
    const g = parseInt(hexCode.substring(2, 4), 16) / 255;
    const b = parseInt(hexCode.substring(4, 6), 16) / 255;

    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);

    const lightness = 100 * ((cMax + cMin) / 2);

    return lightness;
}
