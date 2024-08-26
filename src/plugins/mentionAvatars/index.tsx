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
import type { UserRecord } from "@vencord/discord-types";
import { GuildStore, SelectedGuildStore, useState } from "@webpack/common";

const settings = definePluginSettings({
    showAtSymbol: {
        type: OptionType.BOOLEAN,
        description: "Whether the the @ symbol should be displayed on user mentions",
        default: true
    }
});

const DefaultRoleIcon = () => (
    <svg
        className="vc-mentionAvatars-icon vc-mentionAvatars-role-icon"
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M14 8.00598c0 2.20502-1.794 4.00002-4 4.00002-2.205 0-4-1.795-4-4.00002 0-2.205 1.794-4 4-4s4 1.795 4 4ZM2 19.006c0-3.533 3.29-6 8-6 4.711 0 8 2.467 8 6v1H2v-1Zm18.0001 1h2v-1c0-2.5627-1.7304-4.5645-4.4788-5.4708 1.5408 1.3775 2.4788 3.2707 2.4788 5.4708v1Zm-5.1167-8.0983c1.7823-.4033 3.1167-2 3.1167-3.90172 0-2.03682-1.5308-3.7238-3.503-3.96928.9351 1.05841 1.503 2.44854 1.503 3.96928 0 1.4429-.5112 2.76822-1.3623 3.80422.0825.0316.1644.0641.2456.0975Z" />
    </svg>
);

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
            match: /children:\[\i&&.{0,50}\.RoleDot.{0,300},\i(?=\])/,
            replace: "$&,$self.renderRoleIcon(arguments[0])"
        }
    }],

    renderUsername: ErrorBoundary.wrap((props: { user?: UserRecord; username: string; }) => {
        const { user, username } = props;
        const [isHovering, setIsHovering] = useState(false);

        if (!user) return getUsernameString(username);

        return (
            <span
                onMouseEnter={() => { setIsHovering(true); }}
                onMouseLeave={() => { setIsHovering(false); }}
            >
                <img
                    src={user.getAvatarURL(SelectedGuildStore.getGuildId(), 16, isHovering)}
                    className="vc-mentionAvatars-icon"
                    style={{ borderRadius: "50%" }}
                />
                {getUsernameString(username)}
            </span>
        );
    }, { noop: true }),

    renderRoleIcon: ErrorBoundary.wrap(({ roleId, guildId }: { roleId: string; guildId: string; }) => {
        // Discord uses Role Mentions for uncached users because .... idk
        if (!roleId) return null;

        const role = GuildStore.getRole(guildId, roleId);

        if (!role?.icon) return <DefaultRoleIcon />;

        return (
            <img
                className="vc-mentionAvatars-icon vc-mentionAvatars-role-icon"
                src={`${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/role-icons/${roleId}/${role.icon}.webp?size=24&quality=lossless`}
            />
        );
    }),
});

function getUsernameString(username: string) {
    return settings.store.showAtSymbol
        ? `@${username}`
        : username;
}
