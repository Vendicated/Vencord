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
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ChannelStore, Constants, FluxDispatcher, React, RestAPI, Tooltip } from "@webpack/common";
import { CustomEmoji } from "@webpack/types";
import { Message, ReactionEmoji, User } from "discord-types/general";

const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");
const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");
let Scroll: any = null;
const queue = new Queue();
let reactions: Record<string, ReactionCacheEntry>;

function fetchReactions(msg: Message, emoji: ReactionEmoji, type: number) {
    const key = emoji.name + (emoji.id ? `:${emoji.id}` : "");
    return RestAPI.get({
        url: Constants.Endpoints.REACTIONS(msg.channel_id, msg.id, key),
        query: {
            limit: 100,
            type
        },
        oldFormErrors: true
    })
        .then(res => {
            for (const user of res.body) {
                FluxDispatcher.dispatch({
                    type: "USER_UPDATE",
                    user
                });
            }

            FluxDispatcher.dispatch({
                type: "MESSAGE_REACTION_ADD_USERS",
                channelId: msg.channel_id,
                messageId: msg.id,
                users: res.body,
                emoji,
                reactionType: type
            });
        })
        .catch(console.error)
        .finally(() => sleep(250));
}

function getReactionsWithQueue(msg: Message, e: ReactionEmoji, type: number) {
    const key = `${msg.id}:${e.name}:${e.id ?? ""}:${type}`;
    const cache = reactions[key] ??= { fetched: false, users: {} };
    if (!cache.fetched) {
        queue.unshift(() => fetchReactions(msg, e, type));
        cache.fetched = true;
    }

    return cache.users;
}

function makeRenderMoreUsers(users: User[]) {
    return function renderMoreUsers(_label: string, _count: number) {
        return (
            <Tooltip text={users.slice(4).map(u => u.username).join(", ")} >
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className={AvatarStyles.moreUsers}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        +{users.length - 4}
                    </div>
                )}
            </Tooltip >
        );
    };
}

function handleClickAvatar(event: React.MouseEvent<HTMLElement, MouseEvent>) {
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
        },
        {
            find: '"MessageReactionsStore"',
            replacement: {
                match: /function (\i)\(\){(\i)={}(?=.*CONNECTION_OPEN:\1)/,
                replace: "$&;$self.reactions=$2;"
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
        React.useLayoutEffect(() => { // bc need to prevent autoscrolling
            if (Scroll?.scrollCounter > 0) {
                Scroll.setAutomaticAnchor(null);
            }
        });
        React.useEffect(() => {
            const cb = (e: any) => {
                if (e.messageId === message.id)
                    forceUpdate();
            };
            FluxDispatcher.subscribe("MESSAGE_REACTION_ADD_USERS", cb);

            return () => FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD_USERS", cb);
        }, [message.id]);

        const reactions = getReactionsWithQueue(message, emoji, type);
        const users = Object.values(reactions).filter(Boolean) as User[];

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
    users: Record<string, User>;
}

interface RootObject {
    message: Message;
    readOnly: boolean;
    isLurking: boolean;
    isPendingMember: boolean;
    useChatFontScaling: boolean;
    emoji: CustomEmoji;
    count: number;
    burst_user_ids: any[];
    burst_count: number;
    burst_colors: any[];
    burst_me: boolean;
    me: boolean;
    type: number;
    hideEmoji: boolean;
    remainingBurstCurrency: number;
}
