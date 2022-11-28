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

import { ReactionEmoji, User } from "discord-types/general";

import ErrorBoundary from "../components/ErrorBoundary";
import { Devs } from "../utils/constants";
import { LazyComponent, sleep, useForceUpdater } from "../utils/misc";
import { Queue } from "../utils/Queue";
import definePlugin from "../utils/types";
import { findByCode } from "../webpack";
import { ChannelStore, FluxDispatcher, React, RestAPI, Tooltip } from "../webpack/common";
import { findByPropsLazy } from "../webpack/webpack";

const UserSummaryItem = LazyComponent(() => findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");

const ReactionStore = findByPropsLazy("getReactions");

const queue = new Queue();

function fetchReactions(msg: Message, emoji: ReactionEmoji) {
    const key = emoji.name + (emoji.id ? `:${emoji.id}` : "");
    return RestAPI.get({
        url: `/channels/${msg.channel_id}/messages/${msg.id}/reactions/${key}`,
        query: {
            limit: 100
        },
        oldFormErrors: true
    })
        .then(res => FluxDispatcher.dispatch({
            type: "MESSAGE_REACTION_ADD_USERS",
            channelId: msg.channel_id,
            messageId: msg.id,
            users: res.body,
            emoji
        }))
        .catch(console.error)
        .finally(() => sleep(250));
}

function getReactionsWithQueue(msg: Message, e: ReactionEmoji) {
    const key = `${msg.id}:${e.name}:${e.id ?? ""}`;
    const cache = ReactionStore.__getLocalVars().reactions[key] ??= { fetched: false, users: {} };
    if (!cache.fetched) {
        queue.unshift(() =>
            fetchReactions(msg, e)
        );
        cache.fetched = true;
    }

    return cache.users;
}

function makeRenderMoreUsers(users: User[]) {
    return function renderMoreUsers(_label: string, _count: number) {
        return (
            <Tooltip text={users.slice(5).map(u => u.username).join(", ")} >
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className={AvatarStyles.moreUsers}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        +{users.length - 5}
                    </div>
                )}
            </Tooltip >
        );
    };
}

export default definePlugin({
    name: "WhoReacted",
    description: "Renders the Avatars of reactors",
    authors: [Devs.Ven],

    patches: [{
        find: ",reactionRef:",
        replacement: {
            match: /((.)=(.{1,3})\.hideCount)(,.+?reactionCount.+?\}\))/,
            replace: "$1,whoReactedProps=$3$4,$2?null:Vencord.Plugins.plugins.WhoReacted.renderUsers(whoReactedProps)"
        }
    }],

    renderUsers(props: RootObject) {
        return props.message.reactions.length > 10 ? null : (
            <ErrorBoundary noop>
                <this._renderUsers {...props} />
            </ErrorBoundary>
        );
    },

    _renderUsers({ message, emoji }: RootObject) {
        const forceUpdate = useForceUpdater();
        React.useEffect(() => {
            const cb = (e: any) => {
                if (e.messageId === message.id)
                    forceUpdate();
            };
            FluxDispatcher.subscribe("MESSAGE_REACTION_ADD_USERS", cb);

            return () => FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD_USERS", cb);
        }, [message.id]);

        const reactions = getReactionsWithQueue(message, emoji);
        const users = Object.values(reactions).filter(Boolean) as User[];

        return (
            <div
                style={{ marginLeft: "0.5em", transform: "scale(0.9)" }}
            >
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
        );
    }
});


export interface GuildMemberAvatar { }

export interface Author {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    avatarDecoration?: any;
    email: string;
    verified: boolean;
    bot: boolean;
    system: boolean;
    mfaEnabled: boolean;
    mobile: boolean;
    desktop: boolean;
    premiumType: number;
    flags: number;
    publicFlags: number;
    purchasedFlags: number;
    premiumUsageFlags: number;
    phone: string;
    nsfwAllowed: boolean;
    guildMemberAvatars: GuildMemberAvatar;
}

export interface Emoji {
    id: string;
    name: string;
}

export interface Reaction {
    emoji: Emoji;
    count: number;
    burst_user_ids: any[];
    burst_count: number;
    burst_colors: any[];
    burst_me: boolean;
    me: boolean;
}

export interface Message {
    id: string;
    type: number;
    channel_id: string;
    author: Author;
    content: string;
    deleted: boolean;
    editHistory: any[];
    attachments: any[];
    embeds: any[];
    mentions: any[];
    mentionRoles: any[];
    mentionChannels: any[];
    mentioned: boolean;
    pinned: boolean;
    mentionEveryone: boolean;
    tts: boolean;
    codedLinks: any[];
    giftCodes: any[];
    timestamp: string;
    editedTimestamp?: any;
    state: string;
    nonce?: any;
    blocked: boolean;
    call?: any;
    bot: boolean;
    webhookId?: any;
    reactions: Reaction[];
    applicationId?: any;
    application?: any;
    activity?: any;
    messageReference?: any;
    flags: number;
    isSearchHit: boolean;
    stickers: any[];
    stickerItems: any[];
    components: any[];
    loggingName?: any;
    interaction?: any;
    interactionData?: any;
    interactionError?: any;
}

export interface Emoji {
    id: string;
    name: string;
    animated: boolean;
}

export interface RootObject {
    message: Message;
    readOnly: boolean;
    isLurking: boolean;
    isPendingMember: boolean;
    useChatFontScaling: boolean;
    emoji: Emoji;
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
