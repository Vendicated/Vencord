/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

let style: HTMLStyleElement | null = null;

export default definePlugin({
    name: "HideTopBar",
    description: "Hides the annoying top bar that only has the name of the server, the inbox button and the help button. Use this if you dont care about the inbox and the top bar annoys you.",
    authors: [Devs.Lutitious],

    start(): void {
        // This will force the app to take up all available space.
        document.querySelector(".base_c48ade")?.setAttribute("data-fullscreen", "true");

        // This will hide the top bar at the top of the app.
        style = document.createElement("style");
        style.textContent = `
            /* This is the class for the top bar you want to hide */
            .bar_c38106 {
                display: none;
            }
        `;
        document.head.appendChild(style);
    },

    stop(): void {
        // Make the app take up the normal amount of space again.
        document.querySelector(".base_c48ade")?.setAttribute("data-fullscreen", "false");

        // 2. Remove code that hides the top bar
        style = document.createElement("style");
        style.textContent = `
            /* This is the class for the top bar you want to hide */
            .bar_c38106 {
                display: none;
            }
        `;
        if (style) {
            style.remove();
            style = null;
        }
    }
});
