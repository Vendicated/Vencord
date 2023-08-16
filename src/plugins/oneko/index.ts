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
import  definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components/SettingSliderComponent";
import * as oneko from "./oneko-element.js";
const settings = definePluginSettings({
    speed: {
        description: "Speed of cat",
        type: OptionType.SLIDER, // "y566666666444t" - My cat Coraline, stepping on my keyboard -- Korbo
        restartNeeded: true,
        markers: makeRange(10, 20, 1),
        default: 10,
    },
});

export default definePlugin({
    name: "oneko",
    description: "cat follow mouse (real)",
    // Listing adryd here because this literally just runs her script
    authors: [Devs.Ven, Devs.adryd, Devs.Korbo],
    settings,

    start() {
        let nekoEl = document.createElement('o-neko');
        nekoEl.setAttribute('speed', settings.store.speed);
        nekoEl.setAttribute('x', Math.random() * window.innerWidth);
        nekoEl.setAttribute('y', Math.random() * window.innerHeight);
        document.body.appendChild(nekoEl);
    },

    stop() {
        document.querySelectorAll("o-neko").forEach((oneko => oneko.remove()))
    }
});
