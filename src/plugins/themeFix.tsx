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

/* eslint-disable dot-notation */
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";
import { React } from "@webpack/common";
import { hex2Rgb } from "plugins/shikiCodeblocks/utils/color";

type React = typeof import("react");

let fixesStyle: HTMLStyleElement | null = null;

interface Color {
    hex: string;
    hsl: { [K in "h" | "s" | "l"]: number };
}

function getStaticFixes() {
    try {
        const searchFocused = findByProps("focused", "queryText").focused as string;
        const scrollerAuto = findByProps("auto", "managedReactiveScroller").auto.split(" ")[0] as string;
        const {
            searchFilter,
            searchAnswer,
        } = findByProps("searchFilter", "searchAnswer") as Record<string, string>;

        // As close to default theme as possible
        return {
            [searchFocused]: "var(--background-primary)",
            [`${scrollerAuto}::-webkit-scrollbar-track`]: "var(--primary-dark-630)",
            [searchFilter]: "var(--primary-dark-560)",
            [searchAnswer]: "var(--primary-dark-560)",
        };
    } catch {
        return {};
    }
}

export default definePlugin({
    name: "ThemeExperimentFix",
    description: 'Fixes parts of Discord that they forgot to make themeable via the "Client Themes" experiment',
    authors: [Devs.Vap],
    patches: [
        {
            find: "clientThemeCSS",
            replacement: {
                match: /clientThemeCSS:\i\.useMemo.+?\[(\i)\].+?\.clientThemeCSS;/,
                replace: "$&$self.useThemeFix($1);",
            }
        }
    ],
    useThemeFix(colorMap: Record<string, Color>) {
        React.useEffect(() => {
            const rgbMap: Record<string, number[]> = {};
            for (const [k, v] of Object.entries(colorMap)) {
                if (!k.startsWith("primary-dark")) continue;
                const [r, g, b] = hex2Rgb(v.hex);
                rgbMap[k] = [r, g, b];
            }
            this.apply(rgbMap);
            return () => fixesStyle?.remove();
        }, [colorMap]);
    },
    apply(rgbMap: Record<string, number[]>) {
        const cssBody = [...Object.entries(rgbMap)].map(([k, v]) => `--${k}-rgb:${v.join(",")}`).join(";");
        fixesStyle?.remove();
        fixesStyle = document.createElement("style");
        fixesStyle.innerHTML = `.theme-custom{${cssBody}}`;
        const staticFixes = getStaticFixes();
        for (const [k, v] of Object.entries(staticFixes)) {
            fixesStyle.innerHTML += `.theme-custom .${k}{background-color:${v}}`;
        }
        document.head.appendChild(fixesStyle);
    },
});
