/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import { parseUrl } from "@utils/misc";
import { fromPascal, toTitle } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";

import cssText from "~fileContent/style.css";

import { Settings } from "../../Vencord";
import { shiki } from "./api/shiki";
import { themes } from "./api/themes";
import { createHighlighter } from "./components/Highlighter";
import { DeviconSetting, HljsSetting, ShikiSettings } from "./types";

const themeNames = Object.keys(themes);
const mainStyle: HTMLStyleElement = document.createElement("style");
const devIconStyle: HTMLStyleElement = document.createElement("style");
mainStyle.innerText = cssText;
devIconStyle.innerHTML = "@import url('https://cdn.jsdelivr.net/gh/devicons/devicon@v2.10.1/devicon.min.css');";

const getSettings = () => Settings.plugins.ShikiCodeblocks as ShikiSettings;

export default definePlugin({
    name: "ShikiCodeblocks",
    description: "Brings vscode-style codeblocks into Discord, powered by Shiki",
    authors: [Devs.Vap],
    patches: [
        {
            find: "codeBlock:{react:function",
            replacement: {
                match: /codeBlock:\{react:function\((.),(.),(.)\)\{/,
                replace: "$&return Vencord.Plugins.plugins.ShikiCodeblocks.renderHighlighter($1,$2,$3);",
            },
        },
    ],
    start: async () => {
        document.head.appendChild(mainStyle);
        if (getSettings().useDevIcon !== DeviconSetting.Disabled) document.head.appendChild(devIconStyle);

        await shiki.init(getSettings().customTheme || getSettings().theme);
    },
    stop: () => {
        shiki.destroy();
        mainStyle?.remove();
        devIconStyle?.remove();
    },
    options: {
        theme: {
            type: OptionType.SELECT,
            description: "Default themes",
            options: themeNames.map(themeName => ({
                label: toTitle(fromPascal(themeName)),
                value: themes[themeName],
                default: themes[themeName] === themes.DarkPlus,
            })),
            disabled: () => !!getSettings().customTheme,
            onChange: shiki.setTheme,
        },
        customTheme: {
            type: OptionType.STRING,
            description: "A link to a custom vscode theme",
            placeholder: themes.MaterialCandy,
            isValid: value => {
                if (!value) return true;
                const url = parseUrl(value);
                if (!url) return "Must be a valid URL";

                if (!url.pathname.endsWith(".json")) return "Must be a json file";

                return true;
            },
            onChange: value => shiki.setTheme(value || getSettings().theme),
        },
        tryHljs: {
            type: OptionType.SELECT,
            description: "Use the more lightweight default Discord highlighter and theme.",
            options: [
                {
                    label: "Never",
                    value: HljsSetting.Never,
                },
                {
                    label: "Secondary",
                    value: HljsSetting.Secondary,
                    default: true,
                },
                {
                    label: "Primary",
                    value: HljsSetting.Primary,
                },
                {
                    label: "Always",
                    value: HljsSetting.Always,
                },
            ],
        },
        useDevIcon: {
            type: OptionType.SELECT,
            description: "How to show devicons on codeblocks",
            options: [
                {
                    label: "Disabled",
                    value: DeviconSetting.Disabled,
                },
                {
                    label: "Colorless",
                    value: DeviconSetting.Greyscale,
                    default: true,
                },
                {
                    label: "Colored",
                    value: DeviconSetting.Color,
                },
            ],
            onChange: (newValue: DeviconSetting) => {
                if (newValue === DeviconSetting.Disabled && devIconStyle.isConnected)
                    devIconStyle.remove();
                else if (newValue === DeviconSetting.Disabled && !devIconStyle.isConnected)
                    document.head.appendChild(devIconStyle);
            },
        },
        bgOpacity: {
            type: OptionType.SLIDER,
            description: "Background opacity",
            markers: [0, 20, 40, 60, 80, 100],
            default: 100,
        },
    },

    // exports
    shiki,
    createHighlighter,
    renderHighlighter: ({ lang, content }: { lang: string; content: string; }) => {
        return createHighlighter({
            lang,
            content,
            isPreview: false,
        });
    },
});
