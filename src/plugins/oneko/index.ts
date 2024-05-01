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
import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
function runner() {
    fetch("https://raw.githubusercontent.com/adryd325/oneko.js/8fa8a1864aa71cd7a794d58bc139e755e96a236c/oneko.js")
        .then(x => x.text())
        .then(s => eval(s.replace(/(?<=const\s+nekoSpeed\s*=\s*)\S+?(?=\s*;)/, `${settings.store.speed}`)
            .replace("./oneko.gif", "https://raw.githubusercontent.com/adryd325/oneko.js/14bab15a755d0e35cd4ae19c931d96d306f99f42/oneko.gif")
            .replace("(isReducedMotion)", "(false)")));
}
export const settings = definePluginSettings({
    speed: {
        description: "Speed of Da Cat :3",
        type: OptionType.SLIDER,
        default: 10,
        markers: [1, 10, 15, 20, 25, 30, 35, 40, 45, 50],
        onChange: () => {
            if (Settings.plugins.oneko.enabled) {
                document.getElementById("oneko")?.remove();
                runner();
            }
            return;
        }
    },
});
export default definePlugin({
    name: "oneko",
    description: "cat follow mouse (real)",
    // Listing adryd here because this literally just evals her script
    authors: [Devs.Ven, Devs.adryd, Devs.varram],

    settings,

    start() {
        runner();
    },

    stop() {
        document.getElementById("oneko")?.remove();
    }
});
