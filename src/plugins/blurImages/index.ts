/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

function setCss() {
    const styleElement = document.createElement("style");
    styleElement.id = "blurImage";
    styleElement.textContent = `
   .imageWrapper_fd6587 {
       filter: blur(${Settings.plugins.BlurImages.blurAmount}px);
   }
   .imageWrapper_fd6587:hover { filter: unset; }
`;
    document.head.appendChild(styleElement);

}

export default definePlugin({
    name: "BlurImages",
    description: "Blurs all images until hovered",
    authors: [Devs.HellBri8nger],
    patches: [],
    options: {
        blurAmount: {
            type: OptionType.NUMBER,
            description: "Blur Amount",
            default: 10,
            onChange: setCss
        }
    },

    start() {
        setCss();
    },
    stop() {
        const image_class = document.getElementById("blurImage");
        image_class?.remove();
    }
});
