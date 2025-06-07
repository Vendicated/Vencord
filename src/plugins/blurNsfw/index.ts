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

import { definePluginSettings } from "@api/Settings";
import { setStyleVariables } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import managedStyle from "./style.css?managed";

export default definePlugin({
    name: "BlurNSFW",
    description: "Blur attachments in NSFW channels until hovered",
    authors: [Devs.Ven],
    managedStyle,

    patches: [
        {
            find: ".embedWrapper,embed",
            replacement: [{
                match: /\.container/,
                replace: "$&+(this.props.channel.nsfw? ' vc-nsfw-img': '')"
            }]
        }
    ],

    settings: definePluginSettings({
        blurAmount: {
            type: OptionType.NUMBER,
            description: "Blur Amount (in pixels)",
            default: 10,
            onChange(v) {
                setStyleVariables(managedStyle, { blurAmount: v });
            }
        }
    }),

    start() {
        setStyleVariables(managedStyle, { blurAmount: this.settings.store.blurAmount });
    }
});
