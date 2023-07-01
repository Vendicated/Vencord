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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { SettingsRouter } from "@webpack/common";

const isMac = navigator.platform.includes("Mac");

export default definePlugin({
    name: "WebKeybinds",
    description: "Re-adds keybinds missing in the web version of Discord: ctrl+t, ctrl+tab, ctrl+shift+tab, ctrl+1-9, ctrl+,",
    authors: [Devs.Ven],
    enabledByDefault: true,

    patches: [{
        find: '"mod+n"',
        replacement: {
            // isDesktop || (keybindBlackList = keybindBlackList.concat(desktopKeybinds))
            match: /;\i\.\i(?=\|\|\(\i=\i\.concat)/,
            // kill isWeb check
            replace: ";true"
        }
    }],

    // 3 billion iq discord for some reason implements ctrl+, natively so have to do it manually
    onKey(e: KeyboardEvent) {
        if (e.key === "," && (isMac ? e.metaKey : e.ctrlKey)) {
            e.preventDefault();
            SettingsRouter.open("My Account");
        }
    },

    start() {
        addEventListener("keydown", this.onKey);
    },

    stop() {
        removeEventListener("keydown", this.onKey);
    },
});
