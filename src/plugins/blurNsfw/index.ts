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

import { Settings } from "@api/Settings";
import { compileStyle, disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import style from "./style.css?managed";

export default definePlugin({
    name: "BlurNSFW",
    description: "Blur attachments in NSFW channels until hovered",
    authors: [Devs.Ven],

    patches: [
        {
            find: ".embedWrapper,embed",
            replacement: [{
                match: /\.container/,
                replace: "$&+(this.props.channel.nsfw? ' vc-nsfw-img': '')"
            }]
        }
    ],

    options: {
        blurAmount: {
            type: OptionType.NUMBER,
            description: "Blur Amount",
            default: 10,
            onChange: () => compileStyle(style)
        }
    },

    start() {
        style.edit = src => src.replace("blur-amount", Settings.plugins.BlurNSFW.blurAmount);
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
    }
});
