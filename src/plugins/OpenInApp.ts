/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Sofia Lima
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

import { addClickListener, removeClickListener } from "@api/MessageEvents";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "OpenInApp",
    description: "Allows you to open links in their respective apps.",
    authors: [{ name: "salad", id: 884947813744640020n }],
    dependencies: ["MessageEventsAPI"],

    start() {
        this.clickListener = addClickListener((_, __, event) => {
            const target = event.target as HTMLAnchorElement;
            if (!target.href) return;

            if (target.href.startsWith("https://open.spotify.com/")) {
                target.href = `spotify://${target.href}`;
            } else if (target.href.startsWith("https://store.steampowered.com/app/" || target.href.startsWith("https://steamcommunity.com/"))) {
                target.href = `steam://openurl/${target.href}`;
            }
        });
    },

    stop() {
        removeClickListener(this.clickListener);
    }
});
