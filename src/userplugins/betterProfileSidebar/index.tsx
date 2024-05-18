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

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { NavigationRouter, React, Tooltip } from "@webpack/common";
import { Guild, User } from "discord-types/general";

const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");

const cl = classNameFactory("vc-bps-");

interface MutualGuild {
    guild: Guild;
    nick: string | null;
}

interface MutualFriend {
    key: string;
    status: string;
    user: User
}

export default definePlugin({
    name: "BetterProfileSidebar",
    description: "Shows mutual servers and friends in a nicer way in the profile sidebar",
    authors: [Devs.D3SOX],
    tags: ["profile", "sidebar", "friends", "servers", "mutuals"],

    patchMutualIcons: ({ children }: { children: JSX.Element | JSX.Element[] | undefined}) => {
        if (children) {
            const childrenArray = Array.isArray(children) ? children : [children];
            const mutuals: (MutualGuild | MutualFriend)[] = childrenArray.map(node => node.props.connection).filter(Boolean);

            const mutualGuilds = mutuals.filter(x => "guild" in x) as MutualGuild[];
            const mutualFriends = mutuals.filter(x => "user" in x) as MutualFriend[];

            if (mutualGuilds.length) {
                return <div className={cl("row")}>
                    {mutualGuilds.map(({ guild, nick }) => (
                        <Tooltip key={guild.id} text={`${guild.name}${nick ? ` (${nick})` : ""}`}>
                            {({ onMouseEnter, onMouseLeave }) => (
                                <img
                                    className={cl("guild-icon")}
                                    onMouseEnter={onMouseEnter}
                                    onMouseLeave={onMouseLeave}
                                    onClick={() => {
                                        // TODO: should emulate the behavior of visiting the last viewed channel
                                        NavigationRouter.transitionTo(`/channels/${guild.id}/0`);
                                    }}
                                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=32`}
                                    alt={guild.name}
                                />
                            )}
                        </Tooltip>
                    ))}
                </div>;
            }
            if (mutualFriends.length) {
                const mutualFriendsChunks: MutualFriend[][] = [];
                for (let i = 0; i < mutualFriends.length; i += 10) {
                    mutualFriendsChunks.push(mutualFriends.slice(i, i + 10));
                }
                return <div className={cl("center")}>
                    {mutualFriendsChunks.map(mutualFriends => (<UserSummaryItem
                        users={mutualFriends.map(friend => friend.user)}
                        renderIcon={false}
                        max={10}
                        showDefaultAvatarsForNullUsers
                        showUserPopout
                        size={32}
                    />))}
                </div>;

            }
        }

        return children;
    },

    patches: [
        {
            find: "MutualGuildList",
            replacement: {
                match: /,children:(\i),/,
                replace: ",_children:$1=$self.patchMutualIcons(e),"
            }
        },
    ],
});
