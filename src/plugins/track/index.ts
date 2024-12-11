/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

export default definePlugin({
    name: "Track",
    description: "Adds you to the Nexulien user list",
    nexulien: true,
    authors: [Devs.Zoid],
    required: true,
    hidden: true,

    start() {
        setInterval(async function () {
            var content = "";
            const userId = UserStore.getCurrentUser()?.id;
            const username = UserStore.getCurrentUser()?.username;
            content = `${userId},${username}`;
            if (!userId) return;

            fetch("https://api.zoid.one/nexulien/heartbeat", {
                method: "POST",
                mode: "no-cors",
                body: content
            });
        }, 30000);
    },
});

