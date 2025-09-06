/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "Hide Active Now Sidebar",
    description: "Hides the 'Active Now' sidebar",
    authors: [Devs.bayrem],

    start() {
        this.addStyles();
        this.observeAndHide();
    },

    stop() {
        this.removeStyles();
        if (this.observer) {
            this.observer.disconnect();
        }
    },

    observer: null as MutationObserver | null,

    addStyles() {
        const style = document.createElement("style");
        style.id = "hide-active-now-sidebar";
        style.textContent = `
            /* Hide elements with nowPlayingColumn in their class name */
            [class*="nowPlayingColumn"] {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    },

    removeStyles() {
        const style = document.getElementById("hide-active-now-sidebar");
        if (style) {
            style.remove();
        }
    },

    hideElements() {
        // Find all elements with nowPlayingColumn in their class name
        const elements = document.querySelectorAll('[class*="nowPlayingColumn"]');
        elements.forEach(element => {
            (element as HTMLElement).style.display = "none";
        });
    },

    observeAndHide() {
        // Initial hide
        this.hideElements();

        // Create observer to hide dynamically added elements
        this.observer = new MutationObserver(() => {
            this.hideElements();
        });

        // Start observing
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"]
        });
    }
});
