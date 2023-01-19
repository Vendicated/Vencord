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

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { GuildMemberStore, React } from "@webpack/common";

const Avatar = findByCodeLazy(".Positions.TOP,spacing:");

export default definePlugin({
    name: "TypingTweaks",
    description: "Show avatars and role colours in the typing indicator",
    authors: [Devs.zt],
    patches: [
        {
            find: "getCooldownTextStyle",
            replacement: {
                match: /=(\i)\[2];(.+)"aria-atomic":!0,children:(\i)}\)/,
                replace: "=$1[2];$2\"aria-atomic\":!0,style:{display:\"grid\",gridAutoFlow:\"column\",gridGap:\"0.25em\"},children:$self.mutateChildren(this.props,$1,$3)})"
            }
        },
        {
            find: "getCooldownTextStyle",
            replacement: {
                match: /return \i\.Z\.getName\(.,.\.props\.channel\.id,(.)\)/,
                replace: "return $1"
            }
        },
        {
            find: "t(n,\"SEVERAL_USERS_TYPING\"",
            replacement: {
                match: /(\i)\((\i),"SEVERAL_USERS_TYPING",".+?"\)/,
                replace: "$1($2,\"SEVERAL_USERS_TYPING\",\"**!!{a}!!**, **!!{b}!!**, and {c} others are typing...\")"
            }
        },
        {
            find: "getCooldownTextStyle",
            replacement: {
                match: /(\i)\.length\?.\..\.Messages\.THREE_USERS_TYPING.format\(\{a:(\i),b:(\i),c:.}\).+?SEVERAL_USERS_TYPING/,
                replace: "$&.format({a:$2,b:$3,c:$1.length})"
            }
        }
    ],

    mutateChildren(props, users, children) {
        if (!Array.isArray(children)) return children;

        let element = 0;

        return children.map(c => c.type === "strong" ? <this.TypingUser {...props} user={users[element++]}/> : c);
    },

    TypingUser: ErrorBoundary.wrap(({ user, guildId }) => {
        return <strong style={{
            display: "grid",
            gridAutoFlow: "column",
            gap: "4px",
            color: GuildMemberStore.getMember(guildId, user.id)?.colorString
        }}>
            <div style={{ marginTop: "4px" }}>
                <Avatar
                    size={Avatar.Sizes.SIZE_16}
                    src={user.getAvatarURL(guildId, 128)}/>
            </div>
            {user.username}
        </strong>;
    }, { noop: true })
});
