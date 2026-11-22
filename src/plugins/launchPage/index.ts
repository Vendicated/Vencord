/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelRouter, NavigationRouter, PrivateChannelSortStore } from "@webpack/common";

const settings = definePluginSettings({
    page: {
        type: OptionType.SELECT,
        description: "The page Discord opens on when you launch it",
        options: [
            { label: "Discord default", value: "" },
            { label: "Friends", value: "/channels/@me", default: true },
            { label: "Top DM", value: "dm" }
        ] as const
    }
});

// /app is the value of location.pathname when the connection opens. navigating to somewhere else
// stops discord's default behavior from changing it to quests.
const LAUNCH_PATH = "/app";

export default definePlugin({
    name: "LaunchPage",
    description: "Choose which page Discord opens on at launch, instead of Discord's default (e.g. Quests)",
    tags: ["Utility", "Organisation"],
    authors: [Devs.grialion],
    settings,

    flux: {
        CONNECTION_OPEN() {
            const { page } = settings.store;
            if (!page || location.pathname !== LAUNCH_PATH) return;

            if (page === "dm") {
                const channelIds = PrivateChannelSortStore.getPrivateChannelIds();
                if (channelIds.length > 0) ChannelRouter.transitionToChannel(channelIds[0]);
            } else {
                NavigationRouter.transitionTo(page);
            }
        }
    }
});
