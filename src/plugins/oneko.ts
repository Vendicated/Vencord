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
const settings = definePluginSettings({
    quantity: {
        description: "Amount of cats",
        type: OptionType.SLIDER, // "y566666666444t" - My cat Coraline, stepping on my keyboard -- Korbo
        restartNeeded: true,
        markers: makeRange(1, 10, 1),
        default: 1,
    },
});

export default definePlugin({
    name: "oneko",
    description: "cat(s) follow mouse (real)",
    // Listing adryd here because this literally just evals her script
    authors: [Devs.Ven, Devs.adryd, Devs.Korbo],
    settings,

    start() {
        fetch("https://raw.githubusercontent.com/Korbaux/oneko.js/a0b6ac9adfebddca85cfcb1852ccbf43e60357af/oneko.js")
            .then(x => x.text())
            .then(edit => {for(var i = 0; i < settings.store.quantity; i++) {eval(edit.replace("./oneko.gif", "https://raw.githubusercontent.com/adryd325/oneko.js/14bab15a755d0e35cd4ae19c931d96d306f99f42/oneko.gif")
            .replace('nekoPosX = 32',"nekoPosX = Math.random() * window.innerWidth")
            .replace('nekoPosY = 32',"nekoPosY = Math.random() * window.innerHeight")
            .replaceAll("${nekoPosX - 16}px","${nekoPosX - 16 + " + `${Math.random() * (32 - -32) + -32}` + "}px")
            .replaceAll("${nekoPosY - 16}px","${nekoPosY - 16 + " + `${Math.random() * (32 - -32) + -32}` + "}px"))}})
    },

    stop() {
        clearInterval(window.onekoInterval);
        delete window.onekoInterval;
        document.querySelectorAll("#oneko").forEach((oneko => oneko.remove()))
    }
});
