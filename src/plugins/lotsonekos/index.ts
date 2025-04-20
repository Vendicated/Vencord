/*
 * Tallycord, a modification for Discord's desktop app
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
import { Oneko } from "@shared/lotsonekos";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let onekos: Oneko[] = [];

const settings = definePluginSettings({
    number: {
        type: OptionType.NUMBER,
        description: "Number of onekos",
        onChange: () => {
            if ((settings.store.number || 0) > onekos.length) {
                for (let index = onekos.length; index < (settings.store.number || 0); index++) {
                    onekos.push(new Oneko());
                }
            } else {
                for (let index = onekos.length; index >= (settings.store.number || 0); index--) {
                    onekos.pop()?.element?.remove();
                }
            }
        }
    }
});


export default definePlugin({
    name: "Lots-o-nekos",
    description: "more cat follow mouse (real)",
    authors: [Devs.tally, Devs.adryd],

    start() {
        for (let index = 0; index < (settings.store.number || 0); index++) {
            onekos.push(new Oneko());

        }
    },

    stop() {
        onekos.forEach(oneko => oneko.element?.remove());
        onekos = [];
    }
});
