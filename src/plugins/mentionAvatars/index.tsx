/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { GuildStore, SelectedGuildStore, useState } from "@webpack/common";
import { User } from "discord-types/general";

const settings = definePluginSettings({
    showAtSymbol: {
        type: OptionType.BOOLEAN,
        description: "Whether the the @ symbol should be displayed on user mentions",
        default: true
    }
});

export default definePlugin({
    name: "MentionAvatars",
    description: "Shows user avatars and role icons inside mentions",
    authors: [Devs.Ven, Devs.SerStars],

    patches: [{
        find: ".USER_MENTION)",
        replacement: {
            match: /children:"@"\.concat\((null!=\i\?\i:\i)\)(?<=\.useName\((\i)\).+?)/,
            replace: "children:$self.renderUsername({username:$1,user:$2})"
        }
    },
    {
        find: ".ROLE_MENTION)",
        replacement: {
            match: /function \i\(\i\){let{roleColor:.+?,roleId:(\i),.+?roleName:\i,guildId:(\i).+?}=\i,{analyticsLocations:.+\.ROLE_MENTION\),.+\i&&\(0,\i\.jsx\)\(\i\.RoleDot,{color:\(0,\i\.\i\).+?\.roleDot,background:.+?(1|0)}\),\i/,
            replace: "$&,$self.AddRoleIcon($1,$2)"
        }
    }],

    settings,

    renderUsername: ErrorBoundary.wrap((props: { user: User, username: string; }) => {
        const { user, username } = props;
        const [isHovering, setIsHovering] = useState(false);

        if (!user) return <>{getUsernameString(username)}</>;

        return (
            <span
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <img src={user.getAvatarURL(SelectedGuildStore.getGuildId(), 16, isHovering)} className="vc-mentionAvatars-avatar" />
                {getUsernameString(username)}
            </span>
        );
    }, { noop: true }),

    AddRoleIcon(roleId, guildId) {
        const role = GuildStore.getRole(guildId, roleId);

        if (role?.icon)
            return (
                <img
                    className="vc-mentionAvatars-roleicon"
                    src={`https://cdn.discordapp.com/role-icons/${roleId}/${role.icon}.webp?size=24&quality=lossless`}
                    style={{ width: "16px", height: "16px" }}
                />
            );

        return (
            <svg
                className="vc-mentionAvatars-roleicon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
            >
                <path
                    d="M14 8.00598C14 10.211 12.206 12.006 10 12.006C7.795 12.006 6 10.211 6 8.00598C6 5.80098 7.794 4.00598 10 4.00598C12.206 4.00598 14 5.80098 14 8.00598ZM2 19.006C2 15.473 5.29 13.006 10 13.006C14.711 13.006 18 15.473 18 19.006V20.006H2V19.006Z"
                    fill="currentColor"
                />
                <path
                    d="M14 8.00598C14 10.211 12.206 12.006 10 12.006C7.795 12.006 6 10.211 6 8.00598C6 5.80098 7.794 4.00598 10 4.00598C12.206 4.00598 14 5.80098 14 8.00598ZM2 19.006C2 15.473 5.29 13.006 10 13.006C14.711 13.006 18 15.473 18 19.006V20.006H2V19.006Z"
                    fill="currentColor"
                />
                <path
                    d="M20.0001 20.006H22.0001V19.006C22.0001 16.4433 20.2697 14.4415 17.5213 13.5352C19.0621 14.9127 20.0001 16.8059 20.0001 19.006V20.006Z"
                    fill="currentColor"
                />
                <path
                    d="M14.8834 11.9077C16.6657 11.5044 18.0001 9.9077 18.0001 8.00598C18.0001 5.96916 16.4693 4.28218 14.4971 4.0367C15.4322 5.09511 16.0001 6.48524 16.0001 8.00598C16.0001 9.44888 15.4889 10.7742 14.6378 11.8102C14.7203 11.8418 14.8022 11.8743 14.8834 11.9077Z"
                    fill="currentColor"
                />
            </svg>
        );
    }
});

function getUsernameString(username: string) {
    return settings.store.showAtSymbol
        ? `@${username}`
        : username;
}
