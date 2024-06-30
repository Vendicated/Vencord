/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "removeSupport",
    description: "Removing support button from the header",
    authors: [Devs.Syirezz],

    start() {
        const observer = new MutationObserver(() => {
            const support_button = document.querySelector(".anchor_af404b.anchorUnderlineOnHover_af404b");
            if (support_button) {
                support_button.remove();
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
});
