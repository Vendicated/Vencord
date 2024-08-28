/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

let style: HTMLStyleElement;

export default definePlugin({
    name: "HideActivityTab",
    description: "This plugin hides the recent activity tab on the members list",
    authors: [Devs.dpaulos6],

    async start() {
        style = document.createElement("style");
        style.id = "VencordHideActivityTab";
        document.head.appendChild(style);

        await this.buildCss();
    },

    stop() {
        style.remove();
    },

    async buildCss() {
        style.textContent = `
            .content_eed6a8 .container_c64476,
            .membersGroup_cbd271:has(> .headerContainer_bc6acb) {
                display: none;
            }
        `;
    },
});
