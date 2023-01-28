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
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { OptionType } from "@utils/types";

import { ColorStyle } from "./types";
const colorMethodNames = Object.values(ColorStyle);

const marketCodes = "AD AE AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CG CH CI CL CM CO CR CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IS IT JM JO JP KE KG KH KI KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RW SA SB SC SE SG SI SK SL SM SN SR ST SV SZ TD TG TH TJ TL TN TO TR TT TV TW TZ UA UG US UY UZ VC VE VN VU WS XK ZA ZM ZW".split(" ");
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export const settings = definePluginSettings({
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
        options: marketCodes.map(code => ({
            label: regionNames.of(code) || `??? (${code})`,
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
