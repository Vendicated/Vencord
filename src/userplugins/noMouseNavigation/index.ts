/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoMouseNavigation",
    description: "Aka FFMSB. Disables forward/back navigation with mouse side buttons",
    authors: [{
        name: "Vaker",
        id: 0n
    }],

    start() {
        window.addEventListener("mouseup", this.event);
    },

    stop() {
        window.removeEventListener("mouseup", this.event);
    },

    event(e: MouseEvent) {
        if ([3, 4].includes(e.button)) {
            e.preventDefault();
        }
    }
});
