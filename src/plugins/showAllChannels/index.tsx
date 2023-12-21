/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const { toggleShowAllChannels } = findByPropsLazy("toggleShowAllChannels");
const { isOptInEnabledForGuild } = findByPropsLazy("isOptInEnabledForGuild");

export default definePlugin({
    name: "ShowAllChannels",
    description: "Enable show all channels automatically when joining a new guild.",
    authors: [Devs.Glitch, Devs.Nuckyz, Devs.carince, Devs.Alyxia, Devs.Mopi],
    patches: [
        {
            find: ",acceptInvite(",
            replacement: {
                match: /INVITE_ACCEPT_SUCCESS.+?,(\i)=null!==.+?;/,
                replace: (m, guildId) => `${m}$self.handleShow(${guildId});`,
            },
        },
        {
            find: "{joinGuild:",
            replacement: {
                match: /guildId:(\i),lurker:(\i).{0,20}}\)\);/,
                replace: (m, guildId, lurker) => `${m}if(!${lurker})$self.handleShow(${guildId});`,
            },
        },
    ],

    handleShow(guildId: string | null) {
        if (guildId === "@me" || guildId === "null" || guildId == null) return;
        if (!isOptInEnabledForGuild(guildId)) {
            console.log("[ShowAllChannels] Show all channels is already enabled for", guildId);
            return;
        } else {
            console.log("[ShowAllChannels] Showing all channels for", guildId);
            toggleShowAllChannels(guildId);
        }
    },
});
