/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { InfoIcon } from "@components/Icons";
import { EquicordDevs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import { classes } from "@utils/misc";
import definePlugin, { StartAt } from "@utils/types";
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
    authors: [EquicordDevs.iamme],
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
            find: '"disableGuildNameClick"',
            replacement: [
                {
                    match: /(?=children:\i\.name\}\)\):)/,
                    replace: "onClick:$self.Lurkable(arguments[0].invite.guild.id,arguments[0].invite.guild.features),"
                },
                {
                    match: /\),\{profile:\i,disableGuildNameClick:\i/,
                    replace: "$&,invite:arguments[0].invite"
                },
                {
                    match: /\}\)\)\}\),\i/,
                    replace: "$&,$self.RenderTip(arguments[0].invite.expires_at)"
                },
                {
                    match: /(?<=text:(\i\.name).*?\]\}\))/,
                    replace: "$&,$self.Header(arguments[0].invite.inviter,$1)"
                }
            ]
        },
    ],
    RenderTip(expires_at: string) {
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
        const currentUserId = UserStore.getCurrentUser().id;
        if (!inviter || currentUserId === inviter.id) return null;
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
                    {inviter.username} invited you to {guildName}
                </div>
            </div>
        );
    },
    Lurkable: (id: string, features: Iterable<string> | undefined) => {
        return new Set(features).has("DISCOVERABLE") ? () => lurk(id) : null;
    },
    startAt: StartAt.WebpackReady
});
