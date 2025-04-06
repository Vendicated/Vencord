/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "noDiscordTitleBar",
    description: "Removes the Discord title bar. (useful if you use bucket 0 on the experimental Desktop Visual Refresh or if Discord adds back the disease title bar)",
    authors: [Devs.developerv],

    start() {
        const style = document.createElement("style");
        style.id = "no-discord-titlebar";
        style.textContent = `
            [class*=titleBar] { display: none !important; }
        `;
        document.head.appendChild(style);
    },

    stop() {
        document.getElementById("no-discord-titlebar")?.remove();
    }
});
