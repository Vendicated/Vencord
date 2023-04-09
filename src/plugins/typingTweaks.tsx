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

import { definePluginSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { GuildMemberStore, React, RelationshipStore, SelectedChannelStore } from "@webpack/common";
import { User } from "discord-types/general";

const Avatar = findByCodeLazy('"top",spacing:');
const openProfile = findByCodeLazy("friendToken", "USER_PROFILE_MODAL_OPEN");

const settings = definePluginSettings({
    showAvatars: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show avatars in the typing indicator"
    },
    showRoleColors: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in the typing indicator"
    },
    alternativeFormatting: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show a more useful message when several users are typing"
    }
});

export function buildSeveralUsers({ a, b, c }: { a: string, b: string, c: number; }) {
    return [
        <strong key="0">{a}</strong>,
        ", ",
        <strong key="2">{b}</strong>,
        `, and ${c} others are typing...`
    ];
}

interface Props {
    user: User;
    guildId: string;
}

const TypingUser = ErrorBoundary.wrap(function ({ user, guildId }: Props) {
    return (
        <strong
            role="button"
            onClick={() => {
                openProfile({
                    userId: user.id,
                    guildId,
                    channelId: SelectedChannelStore.getChannelId(),
                    analyticsLocation: {
                        page: guildId ? "Guild Channel" : "DM Channel",
                        section: "Profile Popout"
                    }
                });
            }}
            style={{
                display: "grid",
                gridAutoFlow: "column",
                gap: "4px",
                color: settings.store.showRoleColors ? GuildMemberStore.getMember(guildId, user.id)?.colorString : undefined,
                cursor: "pointer"
            }}
        >
            {settings.store.showAvatars && (
                <div style={{ marginTop: "4px" }}>
                    <Avatar
                        size="SIZE_16"
                        src={user.getAvatarURL(guildId, 128)} />
                </div>
            )}
            {GuildMemberStore.getNick(guildId!, user.id) || !guildId && RelationshipStore.getNickname(user.id) || user.username}
        </strong>
    );
}, { noop: true });

export default definePlugin({
    name: "TypingTweaks",
    description: "Show avatars and role colours in the typing indicator",
    authors: [Devs.zt],
    patches: [
        // Style the indicator and add function call to modify the children before rendering
        {
            find: "getCooldownTextStyle",
            replacement: {
                match: /=(\i)\[2];(.+)"aria-atomic":!0,children:(\i)}\)/,
                replace: "=$1[2];$2\"aria-atomic\":!0,style:{display:\"grid\",gridAutoFlow:\"column\",gridGap:\"0.25em\"},children:$self.mutateChildren(this.props,$1,$3)})"
            }
        },
        // Changes the indicator to keep the user object when creating the list of typing users
        {
            find: "getCooldownTextStyle",
            replacement: {
                match: /return \i\.\i\.getName\(.,.\.props\.channel\.id,(.)\)/,
                replace: "return $1"
            }
        },
        // Adds the alternative formatting for several users typing
        {
            find: "getCooldownTextStyle",
            replacement: {
                match: /((\i)\.length\?.\..\.Messages\.THREE_USERS_TYPING.format\(\{a:(\i),b:(\i),c:.}\)):.+?SEVERAL_USERS_TYPING/,
                replace: "$1:$self.buildSeveralUsers({a:$3,b:$4,c:$2.length-2})"
            },
            predicate: () => settings.store.alternativeFormatting
        }
    ],
    settings,

    buildSeveralUsers,

    mutateChildren(props: any, users: User[], children: any) {
        if (!Array.isArray(children)) return children;

        let element = 0;

        return children.map(c =>
            c.type === "strong"
                ? <TypingUser {...props} user={users[element++]} />
                : c
        );
    },
});
