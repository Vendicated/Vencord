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
import definePlugin from "@utils/types";

const settings = definePluginSettings({
    speed: {
        description: "Cat movement speed",
        type: OptionType.SLIDER,
        markers: makeRange(5, 30, 1),
        default: 10,
        stickToMarkers: yes,
	restartNeeded: true
    },
});

export default definePlugin({
    name: "oneko",
    description: "cat follow mouse (real)",
    // Listing adryd here because this literally just evals her script
    authors: [Devs.Ven, Devs.adryd, Devs.Korbo],

    start() {
	    fetch("https://raw.githubusercontent.com/adryd325/oneko.js/d7e5e3249206a61011978945e72a9c652d449ef3/oneko.js")
            .then(x => x.text())
            .then(s => s.replace("./oneko.gif", "https://raw.githubusercontent.com/adryd325/oneko.js/14bab15a755d0e35cd4ae19c931d96d306f99f42/oneko.gif")
                .replace("(isReducedMotion)", "(false)")
		        .replace("nekoSpeed = 10", `nekoSpeed = ${nekoSpeed}`))
            .then(eval);
    },

    stop() {
        document.getElementById("oneko")?.remove();
    }
});
