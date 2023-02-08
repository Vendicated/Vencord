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
import { GuildMemberStore, React, RelationshipStore } from "@webpack/common";

const Avatar = findByCodeLazy(".Positions.TOP,spacing:");

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
                match: /return \i\.Z\.getName\(.,.\.props\.channel\.id,(.)\)/,
                replace: "return $1"
            }
        },
        // Changes indicator to format message with the typing users
        {
            find: '"SEVERAL_USERS_TYPING":"',
            replacement: {
                match: /("SEVERAL_USERS_TYPING"):".+?"/,
                replace: "$1:\"**!!{a}!!**, **!!{b}!!**, and {c} others are typing...\""
            },
            predicate: () => settings.store.alternativeFormatting
        },
        {
            find: ",\"SEVERAL_USERS_TYPING\",\"",
            replacement: {
                match: /(?<="SEVERAL_USERS_TYPING",)".+?"/,
                replace: '"**!!{a}!!**, **!!{b}!!**, and {c} others are typing..."'
            },
            predicate: () => settings.store.alternativeFormatting
        },
        // Adds the alternative formatting for several users typing
        {
            find: "getCooldownTextStyle",
            replacement: {
                match: /(\i)\.length\?.\..\.Messages\.THREE_USERS_TYPING.format\(\{a:(\i),b:(\i),c:.}\).+?SEVERAL_USERS_TYPING/,
                replace: "$&.format({a:$2,b:$3,c:$1.length-2})"
            },
            predicate: () => settings.store.alternativeFormatting
        }
    ],
    settings,

    mutateChildren(props, users, children) {
        if (!Array.isArray(children)) return children;

        let element = 0;

        return children.map(c => c.type === "strong" ? <this.TypingUser {...props} user={users[element++]} /> : c);
    },

    TypingUser: ErrorBoundary.wrap(({ user, guildId }) => {
        return <strong style={{
            display: "grid",
            gridAutoFlow: "column",
            gap: "4px",
            color: settings.store.showRoleColors ? GuildMemberStore.getMember(guildId, user.id)?.colorString : undefined
        }}>
            {settings.store.showAvatars && <div style={{ marginTop: "4px" }}>
                <Avatar
                    size={Avatar.Sizes.SIZE_16}
                    src={user.getAvatarURL(guildId, 128)} />
            </div>}
            {GuildMemberStore.getNick(guildId!, user.id) || !guildId && RelationshipStore.getNickname(user.id) || user.username}
        </strong>;
    }, { noop: true })
});
