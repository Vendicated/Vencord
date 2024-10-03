/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, GuildMemberStore, useStateFromStores } from "@webpack/common";

export default definePlugin({
    name: "DeadMembers",
    description: "Shows when the sender of a message has left the guild",
    authors: [Devs.Kyuuhachi],

    patches: [
        {
            find: '.BADGES=1]="BADGES"',
            replacement: {
                match: /(\i)=\{className:\i.username,style:.*?onContextMenu:\i,children:.*?\};/,
                replace: "$&$1.children=$self.wrapMessageAuthor(arguments[0],$1.children);"
            }
        },
        {
            find: "Messages.FORUM_POST_AUTHOR_A11Y_LABEL",
            replacement: {
                match: /(?<=\}=(\i),\{(user:\i,author:\i)\}=.{0,400}?\(\i\.Fragment,{children:)\i(?=}\),)/,
                replace: "$self.wrapForumAuthor({...$1,$2},$&)"
            }
        },
    ],

    wrapMessageAuthor({ message }, text) {
        const channel = ChannelStore.getChannel(message.channel_id);
        return message.webhookId
            ? text
            : <DeadIndicator
                channel={channel}
                userId={message.author.id}
                text={text}
            />;
    },

    wrapForumAuthor({ channel, user }, text) {
        return !user
            ? text
            : <DeadIndicator
                channel={channel}
                userId={user.id}
                text={text}
            />;
    },
});


function DeadIndicator({ channel, userId, text }) {
    const isMember = useStateFromStores(
        [GuildMemberStore],
        () => GuildMemberStore.isMember(channel?.guild_id, userId),
    );
    return channel?.guild_id && !isMember ? <s className="c98-author-dead">{text}</s> : text;
}
