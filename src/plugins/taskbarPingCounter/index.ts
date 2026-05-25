/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, RelationshipStore } from "@webpack/common";

const GuildReadStateStore = findStoreLazy("GuildReadStateStore") as {
    getTotalMentionCount(): number;
};

const MessageRequestStore = findStoreLazy("MessageRequestStore") as {
    getMessageRequestsCount(): number;
};

const EVENTS = [
    "MESSAGE_CREATE",
    "MESSAGE_ACK",
    "MESSAGE_DELETE",
    "MESSAGE_DELETE_BULK",
    "MESSAGE_UPDATE",
    "RELATIONSHIP_ADD",
    "RELATIONSHIP_REMOVE",
    "BULK_ACK",
    "CHANNEL_SELECT",
    "CHANNEL_DELETE",
    "GUILD_SELECT"
];

const settings = definePluginSettings({
    includeFriendRequests: {
        type: OptionType.BOOLEAN,
        description: "Includes friend requests in the counter",
        default: true
    },
    includeMessageRequests: {
        type: OptionType.BOOLEAN,
        description: "Includes messages requests in the counter",
        default: true
    }
});

function getPrefix() {
    let count: number = GuildReadStateStore.getTotalMentionCount?.() ?? 0;

    if (settings.store.includeFriendRequests) {
        count += RelationshipStore.getPendingCount();
    }

    if (settings.store.includeMessageRequests) {
        count += MessageRequestStore.getMessageRequestsCount();
    }

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
    tags: ["Notifications", "Appearance"],
    hidden: !IS_DISCORD_DESKTOP,
    settings,

    start() {
        FluxDispatcher.addInterceptor(e => { console.log(e.type); return false; });

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
