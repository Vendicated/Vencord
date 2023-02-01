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

import { definePluginSettings } from "@api/settings";
import { getMarketName, MARKET_CODES } from "@api/Spotify";
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { OptionType } from "@utils/types";

export enum ColorStyle {
    Vibrant = "vibrant",
    Pastel = "pastel",
    Muted = "muted",
    Discord = "discord",
}

const colorMethodNames = Object.values(ColorStyle);

export const settings = definePluginSettings({
    volume: {
        description: "Volume",
        type: OptionType.SLIDER,
        markers: [0, 1],
        default: 0.5,
        componentProps: {
            stickToMarkers: false,
            onValueRender: null,
            onMarkerRender: (value: number) => Math.round(value * 100).toString() + "%",
        },
    },
    colorStyle: {
        description: "Color Style",
        type: OptionType.SELECT,
        options: colorMethodNames.map(name => ({
            label: wordsToTitle(wordsFromCamel(name)),
            value: name,
            default: name === "pastel",
        })),
    },
    forceStyle: {
        description: "Force Style",
        type: OptionType.SLIDER,
        markers: [0, 100],
        default: 0.5,
        componentProps: {
            stickToMarkers: false,
            onValueRender: null,
        }
    },
    market: {
        description: "Market",
        type: OptionType.SELECT,
        options: MARKET_CODES.map(code => ({
            label: getMarketName(code) || `??? (${code})`,
            value: code,
            default: code === "US",
        })),
    },
    nativeLinks: {
        description: "Native Links",
        type: OptionType.BOOLEAN,
        default: false,
    }
});
