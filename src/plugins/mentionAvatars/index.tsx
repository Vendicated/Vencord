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
import { SelectedGuildStore, useState } from "@webpack/common";
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
            replace: "$&,$self.AddRoleIcon($1, $2)"
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
    }, { noop: true })

});

function getUsernameString(username: string) {
    return settings.store.showAtSymbol
        ? `@${username}`
        : username;
}
