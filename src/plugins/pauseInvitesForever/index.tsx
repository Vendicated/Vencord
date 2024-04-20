/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { GuildStore, RestAPI } from "@webpack/common";

const Messages = findByPropsLazy("GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION");

export default definePlugin({
    name: "PauseInvitesForever",
    tags: ["DisableInvitesForever"],
    description: "Brings back the option to pause invites indefinitely that stupit Discord removed.",
    authors: [Devs.Dolfies, Devs.amia],

    patches: [
        {
            find: "Messages.GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION",
            replacement: [{
                match: /children:\i\.\i\.\i\.GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION/,
                replace: "children: $self.renderInvitesLabel(arguments[0].guildId, setChecked)",
            },
            {
                match: /(\i\.hasDMsDisabled\)\(\i\),\[\i,(\i)\]=\i\.useState\(\i\))/,
                replace: "$1,setChecked=$2"
            }]
        }
    ],

    isPermanentlyDisabled(guildId: string) {
        // @ts-ignore
        return GuildStore.getGuild(guildId).hasFeature("INVITES_DISABLED");
    },

    pauseHook(guildId: string) {
        const guild = GuildStore.getGuild(guildId);
        const features = [...guild.features, "INVITES_DISABLED"];
        RestAPI.patch({
            url: `/guilds/${guild.id}`,
            body: { features },
        });
    },

    renderInvitesLabel(guildId: string, setChecked: Function) {
        return (
            <div>
                {Messages.GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION}
                {!this.isPermanentlyDisabled(guildId) && <a onClick={() => {
                    setChecked(true);
                    this.pauseHook(guildId);
                }}> Pause Indefinitely.</a>}
            </div>
        );
    }
});
