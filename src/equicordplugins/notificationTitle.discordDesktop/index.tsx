/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { ChannelStore, GuildStore, RelationshipStore, UserStore } from "@webpack/common";

const { getName } = findByPropsLazy("getName", "useName", "getNickname");
const computeChannelName = findByCodeLazy(".isThread())return'\"'.concat(");

const ChannelTypes = findByPropsLazy("DM", "GUILD_TEXT", "PUBLIC_THREAD", "UNKNOWN");
const ChannelTypesSets = findByPropsLazy("THREADS", "GUILD_TEXTUAL", "ALL_DMS");
const MessageTypes = findByPropsLazy("REPLY", "STAGE_RAISE_HAND", "CHANNEL_NAME_CHANGE");


export default definePlugin({
    name: "NotificationTitle",
    description: "Makes desktop notifications more informative",
    authors: [Devs.Kyuuhachi],

    patches: [
        {
            find: '"SystemMessageUtils.stringify(...) could not convert"',
            replacement: {
                match: /{icon:.{0,45}body:\i}/,
                replace: "($self.makeTitle($&,...arguments))",
            }
        },
    ],

    makeTitle(result, channel, message, user) {
        const username = getName(channel.guild_id, channel.id, user);

        let title = username;
        if (message.type === MessageTypes.REPLY && message.referenced_message?.author) {
            const replyUser = UserStore.getUser(message.referenced_message.author.id);
            const replyUsername = getName(channel.guild_id, channel.id, replyUser);
            title = getIntlMessage("CHANNEL_MESSAGE_REPLY_A11Y_LABEL", {
                author: username,
                repliedAuthor: replyUsername,
            });
        }

        const guild = GuildStore.getGuild(channel.guild_id);
        const parent = ChannelStore.getChannel(channel.parent_id);

        if (channel.type !== ChannelTypes.DM) {
            let where = ChannelTypesSets.THREADS.has(channel.type)
                ? `${channelName(channel)} in ${channelName(parent, true)}`
                : `${channelName(channel, true)}`;
            if (guild != null)
                where += `, ${guild.name}`;
            title += `\n(${where})`;
        }
        result.title = title;

        console.log({ ...result, channel, message, user });

        return result;
    }
});

function channelName(channel, withPrefix = false) {
    return computeChannelName(channel, UserStore, RelationshipStore, withPrefix);
}
