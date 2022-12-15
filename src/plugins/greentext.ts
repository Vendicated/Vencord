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

export default definePlugin({
    name: "Greentext",
    description: "Bring greentext to Discord, for whatever reason.",
    authors: [Devs.Nightdavisao, Devs.axyie],
    css: {
        id: "greentext-css",
        content: ".greentext { color: #789922 }",
    },
    patches: [
        // Webpack Module 62741
        {
            find: "",
        }
    ],
    start() {
        const style = this.style = document.createElement("style");
        style.textContent = this.css.content;
        style.id = this.css.id;
        document.head.appendChild(style);
    },
    stop() {
        this.style?.remove();
    }
});
