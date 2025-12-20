/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getIntlMessage, hasGuildFeature } from "@utils/discord";
import definePlugin from "@utils/types";
import { Constants, GuildStore, PermissionStore, RestAPI } from "@webpack/common";

function showDisableInvites(guildId: string) {
    const guild = GuildStore.getGuild(guildId);
    if (!guild) return false;

    return (
        !hasGuildFeature(guild, "INVITES_DISABLED") &&
        PermissionStore.getGuildPermissionProps(guild).canManageRoles
    );
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
            find: "#{intl::GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION}",
            group: true,
            replacement: [
                {
                    match: /children:\i\.\i\.string\(\i\.\i#{intl::GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION}\)/,
                    replace: "children: $self.renderInvitesLabel({guildId:arguments[0].guildId,setChecked})",
                },
                {
                    match: /\.INVITES_DISABLED\)(?=.+?#{intl::INVITES_PERMANENTLY_DISABLED_TIP}.+?checked:(\i)).+?\[\1,(\i)\]=\i.useState\(\i\)/,
                    replace: "$&,setChecked=$2"
                }
            ]
        }
    ],

    renderInvitesLabel: ErrorBoundary.wrap(({ guildId, setChecked }) => {
        return (
            <div>
                {getIntlMessage("GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION")}
                {showDisableInvites(guildId) && <a role="button" onClick={() => {
                    setChecked(true);
                    disableInvites(guildId);
                }}> Pause Indefinitely.</a>}
            </div>
        );
    }, { noop: true })
});
