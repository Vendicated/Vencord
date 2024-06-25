/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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
import { sleep } from "@utils/misc";
import { Queue } from "@utils/Queue";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import type { GuildEmoji, MessageReactionEmoji, MessageRecord, ReactionType, UserRecord } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ChannelStore, Constants, FluxDispatcher, RestAPI, Tooltip, useEffect, useLayoutEffect } from "@webpack/common";
import type { MouseEvent } from "react";

const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");
const AvatarClasses: Record<string, string> = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");
let Scroll: any = null;
const queue = new Queue();
let reactions: Record<string, ReactionCacheEntry>;

async function fetchReactions(message: MessageRecord, emoji: MessageReactionEmoji, type: ReactionType) {
    const key = emoji.name + (emoji.id ? `:${emoji.id}` : "");
    try {
        const res = await RestAPI.get({
            url: Constants.Endpoints.REACTIONS(message.channel_id, message.id, key),
            query: {
                limit: 100,
                type
            },
            oldFormErrors: true
        });
        FluxDispatcher.dispatch({
            type: "MESSAGE_REACTION_ADD_USERS",
            channelId: message.channel_id,
            messageId: message.id,
            users: res.body,
            emoji,
            reactionType: type
        });
    } catch (e) {
        console.error(e);
    } finally {
        await sleep(250);
    }
}

function getReactionsWithQueue(message: MessageRecord, emoji: MessageReactionEmoji, type: ReactionType) {
    const key = `${message.id}:${emoji.name}:${emoji.id ?? ""}:${type}`;
    const cache = reactions[key] ??= { fetched: false, users: {} };
    if (!cache.fetched) {
        queue.unshift(() => fetchReactions(message, emoji, type));
        cache.fetched = true;
    }

    return cache.users;
}

function makeRenderMoreUsers(users: UserRecord[]) {
    return function renderMoreUsers(_label: string, _count: number) {
        return (
            <Tooltip text={users.slice(4).map(u => u.username).join(", ")}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className={AvatarClasses.moreUsers}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        +{users.length - 4}
                    </div>
                )}
            </Tooltip>
        );
    };
}

function handleClickAvatar(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
}

export default definePlugin({
    name: "WhoReacted",
    description: "Renders the avatars of users who reacted to a message",
    authors: [Devs.Ven, Devs.KannaDev, Devs.newwares],

    patches: [
        {
            find: ",reactionRef:",
            replacement: {
                match: /(\i)\?null:\(0,\i\.jsx\)\(\i\.\i,{className:\i\.reactionCount,.*?}\),/,
                replace: "$&$1?null:$self.renderUsers(this.props),"
            }
        }, {
            find: '"MessageReactionsStore"',
            replacement: {
                match: /(?<=CONNECTION_OPEN:function\(\){)(\i)={}/,
                replace: "$&;$self.reactions=$1"
            }
        },
        {

            find: "cleanAutomaticAnchor(){",
            replacement: {
                match: /constructor\(\i\)\{(?=.{0,100}automaticAnchor)/,
                replace: "$&$self.setScrollObj(this);"
            }
        }
    ],

    setScrollObj(scroll: any) {
        Scroll = scroll;
    },

    renderUsers(props: RootObject) {
        return props.message.reactions.length > 10 ? null : (
            <ErrorBoundary noop>
                <this._renderUsers {...props} />
            </ErrorBoundary>
        );
    },
    _renderUsers({ message, emoji, type }: RootObject) {
        const forceUpdate = useForceUpdater();
        useLayoutEffect(() => { // bc need to prevent autoscrolling
            if (Scroll?.scrollCounter > 0) {
                Scroll.setAutomaticAnchor(null);
            }
        });
        useEffect(() => {
            const callback = (action: any) => {
                if (action.messageId === message.id)
                    forceUpdate();
            };
            FluxDispatcher.subscribe("MESSAGE_REACTION_ADD_USERS", callback);

            return () => { FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD_USERS", callback); };
        }, [message.id]);

        const reactions = getReactionsWithQueue(message, emoji, type);
        const users: UserRecord[] = Object.values(reactions).filter(Boolean);

        for (const user of users) {
            FluxDispatcher.dispatch({
                type: "USER_UPDATE",
                user
            });
        }

        return (
            <div
                style={{ marginLeft: "0.5em", transform: "scale(0.9)" }}
            >
                <div onClick={handleClickAvatar}>
                    <UserSummaryItem
                        users={users}
                        guildId={ChannelStore.getChannel(message.channel_id)?.guild_id}
                        renderIcon={false}
                        max={5}
                        showDefaultAvatarsForNullUsers
                        showUserPopout
                        renderMoreUsers={makeRenderMoreUsers(users)}
                    />
                </div>
            </div>
        );
    },

    set reactions(value: any) {
        reactions = value;
    }
});

interface ReactionCacheEntry {
    fetched: boolean;
    users: { [userId: string]: UserRecord; };
}

interface RootObject {
    message: MessageRecord;
    readOnly: boolean;
    isLurking: boolean;
    isPendingMember: boolean;
    useChatFontScaling: boolean;
    emoji: GuildEmoji;
    count: number;
    burst_user_ids: string[];
    burst_count: number;
    burst_colors: string[];
    burst_me: boolean;
    me: boolean;
    type: ReactionType;
    hideEmoji: boolean;
    remainingBurstCurrency: number;
}
