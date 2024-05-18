/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { FluxDispatcher, PresenceStore, UserStore } from "@webpack/common";

const updateAsync = findByCodeLazy("updateAsync");

async function runningGamesChange(event) {
    const { games } = event;
    let savedStatus;
    if (games.length > 0) {
        const currentUser = UserStore.getCurrentUser();
        const status = PresenceStore.getStatus(currentUser.id);
        savedStatus = status;
        if (status === "invisible") return;
        if (status !== "dnd") updateAsync("dnd");
    } else if (games.length === 0) {
        updateAsync(savedStatus);
    }
}

export default definePlugin({
    name: "DNDWhilePlaying",
    description: "Automatically updates your status to Do Not Disturb when playing games and resets it back when stopped playing",
    authors: [{
        name: "thororen",
        id: 848339671629299742n
    }],
    start() {
        FluxDispatcher.subscribe("RUNNING_GAMES_CHANGE", runningGamesChange);
    },
    stop() {
        FluxDispatcher.unsubscribe("RUNNING_GAMES_CHANGE", runningGamesChange);
    }
});
