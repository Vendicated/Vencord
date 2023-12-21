/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { findByPropsLazy } from "@webpack";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const { toggleShowAllChannels } = findByPropsLazy("toggleShowAllChannels");
const { isOptInEnabledForGuild } = findByPropsLazy("isOptInEnabledForGuild");

export default definePlugin({
    name: "ShowAllChannels",
    description: "Enable show all channels automatically when joining a new guild.",
    authors: [
        {
            id: 1022189106614243350n,
            name: "Mopigames",
        },
        Devs.Glitch,
        Devs.Nuckyz,
        Devs.carince,
        Devs.Alyxia
    ],
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
