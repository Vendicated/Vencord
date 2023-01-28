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

import { React } from "@webpack/common";

import { settings } from "../settings";
import { getRgbContrast, hslTargets, hsv2rgb, pickColor } from "../utils/color";
import { RgbPalette } from "../utils/image";
import { lerpList } from "../utils/misc";

export function usePaletteStyle(palette: RgbPalette | null) {
    const { colorStyle, forceStyle } = settings.use(["colorStyle", "forceStyle"]);

    return React.useMemo(() => {
        let accent = "var(--background-secondary)";
        let theme: `theme-${"custom" | "dark" | "light"}` = "theme-custom";

        if (colorStyle !== "discord" && palette) {
            const colorHsl = pickColor(colorStyle, palette);
            if (forceStyle) {
                const lerped = lerpList(colorHsl, hslTargets[colorStyle], forceStyle / 100);
                for (let i = 0; i < 3; i++) colorHsl[i] = isNaN(lerped[i]) ? colorHsl[i] : lerped[i];
            }
            const [r, g, b] = hsv2rgb(colorHsl);
            const contrast = getRgbContrast([r, g, b]);
            accent = `rgb(${r}, ${g}, ${b})`;
            theme = `theme-${contrast}`;
        }

        return [accent, theme] as const;
    }, [JSON.stringify(palette), colorStyle, forceStyle]);
}
