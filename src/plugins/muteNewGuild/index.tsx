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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";

const settings = definePluginSettings({
    guild: {
        description: "Mute Guild",
        type: OptionType.BOOLEAN,
        default: true
    },
    everyone: {
        description: "Suppress @everyone and @here",
        type: OptionType.BOOLEAN,
        default: true
    },
    role: {
        description: "Suppress All Role @mentions",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "MuteNewGuild",
    description: "Mutes newly joined guilds",
    authors: [Devs.Glitch, Devs.Nuckyz, Devs.carince],
    patches: [
        {
            find: ",acceptInvite(",
            replacement: {
                match: /INVITE_ACCEPT_SUCCESS.+?,(\i)=null!==.+?;/,
                replace: (m, guildId) => `${m}$self.handleMute(${guildId});`
            }
        },
        {
            find: "{joinGuild:",
            replacement: {
                match: /guildId:(\i),lurker:(\i).{0,20}}\)\);/,
                replace: (m, guildId, lurker) => `${m}if(!${lurker})$self.handleMute(${guildId});`
            }
        }
    ],
    settings,

    handleMute(guildId: string | null) {
        if (guildId === "@me" || guildId === "null" || guildId == null) return;
        findByProps("updateGuildNotificationSettings").updateGuildNotificationSettings(guildId,
            {
                muted: settings.store.guild,
                suppress_everyone: settings.store.everyone,
                suppress_roles: settings.store.role
            }
        );
    }
});
