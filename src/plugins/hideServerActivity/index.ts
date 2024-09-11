/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

let activityRemoved = false;

export default definePlugin({
    name: "HideServerActivity",
    description: "Hide the server activity from the user list.",
    authors: [Devs.Faab007NL],

    start() {
        setInterval(() => {
            this.hideServerActivity();
        }, 1000);
    },
    stop() {
        this.showServerActivity();
    },

    hideServerActivity() {
        const membersListEl = document.querySelector('div[aria-label="Members"]');
        if (!membersListEl) {
            activityRemoved = false;
            return;
        }

        const { children } = membersListEl;
        const activityTitleEl = children[1];
        const activityContentEl = children[2];

        if (!activityTitleEl || !activityContentEl) {
            activityRemoved = false;
            return;
        }

        if(activityRemoved) return;

        activityTitleEl.style.display = "none";
        activityContentEl.style.display = "none";
    },

    showServerActivity() {
        const membersListEl = document.querySelector('div[aria-label="Members"]');
        if (!membersListEl) return;

        const { children } = membersListEl;
        const activityTitleEl = children[1];
        const activityContentEl = children[2];

        if (!activityTitleEl || !activityContentEl) return;

        activityTitleEl.style.display = "block";
        activityContentEl.style.display = "block";
    }

});
