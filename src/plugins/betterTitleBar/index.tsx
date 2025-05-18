/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "Remove title bar",
    description: "Remove title bar and move buttons to the top bar. \n you will lose the ability to drag the window from the title bar. v1.0",
    authors: [Devs.thiagosch],
    storedTrailing: null as HTMLElement | null,
    observer: null as MutationObserver | null,

    start() {
        const style = document.createElement("style");
        style.id = "better-titlebar-gridfix";
        style.textContent = ` 
            @supports (grid-template-columns:subgrid) and (white-space-collapse:collapse) {
            .visual-refresh [class^="base_"] {
                grid-template-rows: [top] 0 [titleBarEnd] min-content [noticeEnd] 1fr [end] !important;
            }
            }`;
        document.head.appendChild(style);



        const tryMove = () => {
            const upper = document.querySelector('[class^="upperContainer_"]');
            document.querySelector('[class^="subtitleContainer:"]')?.remove();
            if (this.storedTrailing && upper && !upper.contains(this.storedTrailing)) {
                (upper as HTMLElement)?.style?.setProperty("webkitAppRegion", "drag");
                upper.appendChild(this.storedTrailing);
                this.storedTrailing.setAttribute("style", "margin-left: auto; display: flex; align-items: center;");

            }


        };

        const tryCapture = () => {
            const trailing = document.querySelector('[class^="trailing_c38106"]');
            if (trailing && !this.storedTrailing) {
                this.storedTrailing = trailing as HTMLElement;
                tryMove();
            }
        };

        tryCapture();
        this.observer = new MutationObserver(() => {
            tryCapture();
            tryMove();
        });

        this.observer.observe(document.body, { childList: true, subtree: true });

    },

    stop() {
        this.observer?.disconnect();
        this.storedTrailing = null;
        this.observer = null;
        document.documentElement.style.removeProperty("--custom-app-top-bar-height");
    }
});
