/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

const GuildReadStateStore = findStoreLazy("GuildReadStateStore") as {
    getTotalMentionCount(): number;
};

const EVENTS = ["MESSAGE_CREATE", "MESSAGE_ACK", "CHANNEL_SELECT", "GUILD_SELECT"];

function getPrefix() {
    const count: number = GuildReadStateStore.getTotalMentionCount?.() ?? 0;
    return count > 0 ? `(${count}) ` : "";
}

function refreshTitle() {
    if (document.title) {
        document.title = document.title;
    }
}

export default definePlugin({
    name: "TaskbarPingCounter",
    description: "Adds the unread ping counter as a prefix to the window title. Useful for taskbar setups where the window title is visible but not the badge.",
    authors: [Devs.Nekro],
    hidden: !IS_DISCORD_DESKTOP,

    start() {
        const titleDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "title");
        if (!titleDescriptor?.set) return;

        Object.defineProperty(document, "title", {
            configurable: true,
            enumerable: true,
            set(value: string) {
                titleDescriptor.set!.call(document, getPrefix() + value.replace(/^\(\d+\) /, ""));
            },
            get: titleDescriptor.get
        });

        EVENTS.forEach(e => FluxDispatcher.subscribe(e, refreshTitle));

        refreshTitle();
    },

    stop() {
        EVENTS.forEach(e => FluxDispatcher.unsubscribe(e, refreshTitle));

        delete (document as any).title;
        document.title = document.title.replace(/^\(\d+\) /, "");
    },
});
