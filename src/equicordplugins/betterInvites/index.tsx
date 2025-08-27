/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { EquicordDevs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import { classes } from "@utils/misc";
import definePlugin, { StartAt } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Parser } from "@webpack/common";


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
            find: "#{intl::HUB_INVITE_ANOTHER_SCHOOL_LINK}",
            replacement: [
                {
                    match: /,(\i)&&(\(.{0,50}asContainer.+)(\i\.\i\.string\(\i\.\i#{intl::GUEST_MEMBERSHIP_EXPLANATION}\))/,
                    replace: ",($1||((!$1)&&arguments[0].invite.expires_at)) && $2$self.RenderTip($1, $3, arguments[0].invite.expires_at)"
                },
                {
                    match: /(\.jsx\)\(\i.\i.Info,{.+onClick:\i)/,
                    replace: "$& || $self.Lurkable(arguments[0].invite.guild.id, arguments[0].invite.guild.features)"
                },
                {
                    match: /(\.jsx\)\(\i\.\i\.Header,\{)text:(\i)/,
                    replace: "$1text: $self.Header(arguments[0].currentUserId, arguments[0].invite.inviter, $2)"
                }
            ]
        }
    ],
    RenderTip(isGuest: boolean, message: string, expires_at: string) {
        return <>This invite will expire {Parser.parse(`<t:${Math.round(new Date(expires_at).getTime() / 1000)}:R>`)}{isGuest ? ". " + message : ""}</>;
    },
    Header(currentUserId: string, inviter: User | undefined, defaultMessage: string) {
        return <div className="vc-bi-header-inner">
            {(inviter && (currentUserId !== inviter.id)) ? <>
                <img
                    alt=""
                    className={classes(AvatarStyles.avatar, AvatarStyles.clickable) + " vc-bi-inviter-avatar"}
                    onClick={() => openUserProfile(inviter.id)}
                    src={inviter.avatar ? `https://cdn.discordapp.com/avatars/${inviter.id}/${inviter.avatar}.webp?size=80` : "/assets/1f0bfc0865d324c2587920a7d80c609b.png?size=128"}
                /> {inviter.global_name ? inviter.global_name.toUpperCase() : inviter.username.toUpperCase()} HAS INVITED YOU TO JOIN
            </> : defaultMessage}</div>;
    },
    Lurkable: (id: string, features: Iterable<string> | undefined) => {
        return new Set(features).has("DISCOVERABLE") ? () => lurk(id) : null;
    },
    startAt: StartAt.WebpackReady
});
