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

import definePlugin from "@utils/types";

export default definePlugin({
    name: "Better Tab",
    description: "Makes tab an actually useful keybind",
    authors: [{ id: 553652308295155723n, name: "Scyye" }],
    patches:
        [
            /*
            {
                find: "onkeydown",
                replacement: {
                    replace: "keyFilter(event,this);",
                    match: /(\w+)\.onkeydown=function\(\){return\s*!1};/
                }
            }
            */
        ],
    start() {
        // Add event listener to intercept Tab key presses
        document.addEventListener("keydown", function (event) {
            // Check if the Tab key is pressed
            if (event.key === "Tab") {
                // Prevent the default Tab key behavior
                event.preventDefault();

                // If the active element is an input or textarea, allow the default behavior
                if (document.activeElement == null)
                    return;
                if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
                    event.stopImmediatePropagation();
                }
            }
        });
    },
    stop() {
        // Clean up when the plugin is unloaded (optional)
        document.removeEventListener("keydown", function (event) {
            if (document.activeElement == null)
                return;
            if (event.key === "Tab" && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
                event.stopImmediatePropagation();
            }
        });
    },
});
