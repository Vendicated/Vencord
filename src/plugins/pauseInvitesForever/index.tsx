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

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Constants, GuildStore, i18n, RestAPI } from "@webpack/common";

function showDisableInvites(guildId: string) {
    // @ts-ignore
    return !GuildStore.getGuild(guildId).hasFeature("INVITES_DISABLED");
}

function disableInvites(guildId: string) {
    const guild = GuildStore.getGuild(guildId);
    const features = [...guild.features, "INVITES_DISABLED"];
    RestAPI.patch({
        url: Constants.Endpoints.GUILD(guildId),
        body: { features },
    });
}

export default definePlugin({
    name: "PauseInvitesForever",
    tags: ["DisableInvitesForever"],
    description: "Brings back the option to pause invites indefinitely that stupit Discord removed.",
    authors: [Devs.Dolfies, Devs.amia],

    patches: [
        {
            find: "Messages.GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION",
            group: true,
            replacement: [
                {
                    match: /children:\i\.\i\.\i\.GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION/,
                    replace: "children: $self.renderInvitesLabel({guildId:arguments[0].guildId,setChecked})",
                },
                {
                    match: /\.INVITES_DISABLED\)(?=.+?\.Messages\.INVITES_PERMANENTLY_DISABLED_TIP.+?checked:(\i)).+?\[\1,(\i)\]=\i.useState\(\i\)/,
                    replace: "$&,setChecked=$2"
                }
            ]
        }
    ],

    renderInvitesLabel: ErrorBoundary.wrap(({ guildId, setChecked }) => {
        return (
            <div>
                {i18n.Messages.GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION}
                {showDisableInvites(guildId) && <a role="button" onClick={() => {
                    setChecked(true);
                    disableInvites(guildId);
                }}> Pause Indefinitely.</a>}
            </div>
        );
    })
});
