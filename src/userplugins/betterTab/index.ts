/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
