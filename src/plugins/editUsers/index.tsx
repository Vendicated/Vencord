/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";
import { User } from "discord-types/general";

import { getUserOverride, hasFlag, OverrideFlags, settings } from "./data";
import { openUserEditModal } from "./modal";

export default definePlugin({
    name: "EditUsers",
    description: "Edit users",
    authors: [Devs.Ven],

    settings,

    contextMenus: {
        "user-context"(children, { user }: { user?: User; }) {
            if (!user) return;

            children.push(
                <Menu.MenuItem
                    id="vc-edit-user"
                    label="Edit User"
                    action={() => openUserEditModal(user)}
                />
            );
        }
    },

    patches: [
        {
            find: ",getUserTag:",
            replacement: {
                match: /if\(\i\((\i)\.global_name\)\)return(?=.{0,100}return"\?\?\?")/,
                replace: "const vcEuName=$self.getUsername($1);if(vcEuName)return vcEuName;$&"
            }
        },
        {
            find: "=this.guildMemberAvatars[",
            replacement: [
                {
                    match: /&&null!=this\.guildMemberAvatars\[\i\]/,
                    replace: "$& && !$self.shouldIgnoreGuildAvatar(this)"
                },
                {
                    match: /(?<=null!=(\i))\?(\i\.\i\.getGuildMemberAvatarURLSimple.+?):(?=\i\.\i\.getUserAvatarURL\(this)/,
                    replace: "&& this.hasAvatarForGuild?.($1) ? $2 : $self.getAvatarUrl(this)||"
                }
            ]
        },
        {
            find: "this.isUsingGuildMemberBanner()",
            replacement: [
                {
                    match: /:\i\.banner\)!=null/,
                    replace: "$& && !$self.shouldIgnoreGuildBanner(this.userId)"
                },
                {
                    match: /(?<=:).{0,10}\(\{id:this\.userId,banner/,
                    replace: "$self.getBannerUrl(this.userId)||$&"
                },
                {
                    match: /isUsingGuildMemberPronouns\(\)\{/,
                    replace:
                        "set pronouns(v){this._vcPronouns=v}" +
                        "get pronouns(){return $self.getPronouns(this.userId)||this._vcPronouns}" +
                        "isUsingGuildMemberPronouns(){"
                },
                {
                    match: /\i\(this,"pronouns",void 0\),/,
                    replace: ""
                }
            ]
        },
        {
            find: '"GuildMemberStore"',
            replacement: {
                match: /getNick\(\i,(\i)\)\{/,
                replace: "$& if ($self.shouldIgnoreNick($1)) return null;"
            }
        }
    ],

    getUsername: (user: User) => getUserOverride(user.id).username,
    getAvatarUrl: (user: User) => getUserOverride(user.id).avatarUrl,
    getBannerUrl: (userId: string) => getUserOverride(userId).bannerUrl,
    getPronouns: (userId: string) => getUserOverride(userId).pronouns,

    shouldIgnoreGuildAvatar(user: User) {
        const { avatarUrl, flags } = getUserOverride(user.id);

        if (avatarUrl && !hasFlag(flags, OverrideFlags.KeepServerAvatar))
            return true;

        return hasFlag(flags, OverrideFlags.DisableServerAvatars);
    },

    shouldIgnoreGuildBanner(userId: string) {
        const { bannerUrl, flags } = getUserOverride(userId);

        if (bannerUrl && !hasFlag(flags, OverrideFlags.KeepServerBanner))
            return true;

        return hasFlag(flags, OverrideFlags.DisableServerBanners);
    },

    shouldIgnoreNick(userId?: string) {
        if (!userId) return false;

        const { username, flags } = getUserOverride(userId);

        if (username && !hasFlag(flags, OverrideFlags.PreferServerNicks))
            return true;

        return hasFlag(flags, OverrideFlags.DisableNicks);
    }
});
