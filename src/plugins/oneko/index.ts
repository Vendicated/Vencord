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

import "./oneko-element.js";

import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components/SettingSliderComponent";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    speed: {
        description: "Speed of cat",
        type: OptionType.SLIDER, // "y566666666444t" - My cat Coraline, stepping on my keyboard -- Korbo
        restartNeeded: true,
        markers: makeRange(10, 50, 5),
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
        const nekoEl = document.createElement("o-neko");
        nekoEl.setAttribute("speed", settings.store.speed.toString());
        nekoEl.setAttribute("x", String(Math.random() * window.innerWidth));
        nekoEl.setAttribute("y", String(Math.random() * window.innerHeight));
        document.body.appendChild(nekoEl);
    },

    stop() {
        document.querySelectorAll("o-neko").forEach((oneko => oneko.remove()));
    }
});
