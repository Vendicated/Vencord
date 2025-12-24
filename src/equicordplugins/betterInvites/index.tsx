/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { InfoIcon } from "@components/Icons";
import { Devs, EquicordDevs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import { classes } from "@utils/misc";
import definePlugin, { StartAt } from "@utils/types";
import { Guild } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Parser, Tooltip, UserStore } from "@webpack/common";

const AvatarStyles = findByPropsLazy("avatar", "zalgo");
const GuildManager = findByPropsLazy("joinGuild");

interface User {
    id: string;
    avatar: string;
    global_name: string;
    username: string;
}

function lurk(id: string) {
    GuildManager.joinGuild(id, { lurker: true })
        .then(() => { GuildManager.transitionToGuildSync(id); })
        .catch(() => { throw new Error("Guild is not lurkable"); });
}

export default definePlugin({
    name: "BetterInvites",
    description: "See invites expiration date, view inviter profile and preview discoverable servers before joining by clicking their name",
    authors: [EquicordDevs.iamme, Devs.thororen],
    patches: [
        {
            find: ".hideDetailsButtonContainer,",
            replacement: [
                {
                    match: /banner\}\),.{0,25}profile:\i\}\),.{0,15}profile:\i/,
                    replace: "$&,invite:arguments[0].invite"
                }
            ]
        },
        {
            find: ".guildNameContainer,onClick:",
            replacement: [
                {
                    // make the button clickable
                    match: /children:(\i)\.name\}\).{0,100}\.guildNameContainer/,
                    replace: "onClick:$self.Lurkable($1),$&"
                },
                {
                    // tip gets inserted in the name container, header gets inserted beside it
                    match: /(:(\i),disableGuildNameClick:.{0,20}\}\),\i)(\]\}\))/,
                    replace: "$1,$self.RenderTip(arguments[0].invite?.expires_at)$3,$self.Header(arguments[0].invite?.inviter,$2.name)"
                }
            ]
        },
    ],
    RenderTip(expires_at: string) {
        if (!expires_at) return null;
        const timestamp = <>{Parser.parse(`<t:${Math.round(new Date(expires_at).getTime() / 1000)}:R>`)}</>;
        const tooltipText = (
            <>
                This invite will {expires_at ? <>expire {timestamp}</> : <>not expire</>}
            </>
        );

        return (
            <Tooltip text={tooltipText}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className="vc-bi-tooltip"
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        <InfoIcon className="vc-bi-tooltip-icon" />
                    </div>
                )}
            </Tooltip>
        );
    },
    Header(inviter: User | undefined, guildName: string) {
        const userId = UserStore.getCurrentUser().id;
        if (!inviter || userId === inviter.id) return null;
        return (
            <div className="vc-bi-header-inner">
                <img
                    alt=""
                    className={classes(AvatarStyles.avatar, AvatarStyles.clickable) + " vc-bi-inviter-avatar"}
                    onClick={() => openUserProfile(inviter.id)}
                    src={inviter.avatar
                        ? `https://cdn.discordapp.com/avatars/${inviter.id}/${inviter.avatar}.webp?size=80`
                        : "/assets/1f0bfc0865d324c2587920a7d80c609b.png?size=128"}
                />
                <div className="vc-bi-header-text">
                    {inviter.global_name || inviter.username} invited you to {guildName}
                </div>
            </div>
        );
    },
    Lurkable: (guild?: Guild) => {
        if (!guild) return null;
        return new Set(guild.features).has("DISCOVERABLE") ? () => lurk(guild.id) : null;
    },
    startAt: StartAt.WebpackReady
});
