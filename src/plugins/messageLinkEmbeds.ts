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

import { Embed as _Embed, Message } from "discord-types/general";

import { lazy } from "../utils/misc";
import definePlugin from "../utils/types";
import { find, waitFor } from "../webpack";
import { ChannelStore, FluxDispatcher, GuildMemberStore, GuildStore, MessageStore } from "../webpack/common";

const replacement = `
const msgLink = $2.message.content?.match(Vencord.Plugins.plugins.MessageLinkEmbeds.messageLinkRegex)?.[1];

if (msgLink) {
    $2.message.embeds = [
        ...Vencord.Plugins.plugins.MessageLinkEmbeds
          .generateEmbed(msgLink, $2.message.embeds, { channelID: $2.message.channel_id, messageID: $2.message.id })
    ].filter(item => item);
};

var
  $1 = $2.channel,
  $3 = $2.message,
  $4 = $2.renderSuppressEmbeds /* Don't add a semicolon here, there are more definitions after this. */
`.trim().replace(/(?<=[^(?:const)|(?:var)])\s+/gm, "");

const cache: { [id: string]: Message; } = {};

let get: (...args) => Promise<any>;
waitFor(["get", "getAPIBaseURL"], _ => ({ get } = _));
const toTimestamp = lazy(() => find(m => m.prototype?.toDate));

function getMessage(channelID: string, messageID: string, originalMessage?: { channelID: string, messageID: string; }) {
    get({
        // TODO: don't hardcode endpoint
        url: `/channels/${channelID}/messages`,
        query: {
            limit: 1,
            around: messageID
        },
        retries: 2
    }).then(res => {
        const message = res.body?.[0];
        if (!message) return;
        message.timestamp = toTimestamp()(message.timestamp);
        if (message.embeds[0]?.type === "rich") {
            message.embeds[0].rawDescription = message.embeds[0].description || "";
            message.embeds[0].rawTitle = message.embeds[0].title || "";
            message.embeds[0].color &&= "#" + message.embeds[0].color.toString(16);
        }
        cache[message.id] = message;

        if (originalMessage) FluxDispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message: {
                guild_id: ChannelStore.getChannel(originalMessage.channelID).guild_id,
                channel_id: originalMessage.channelID,
                id: originalMessage.messageID,
            }
        });

    }).catch(() => { });
}

interface Embed extends _Embed {
    _isMessageEmbed?: boolean,
    footer?: {
        text: string,
        iconURL?: string;
    };
}

export default definePlugin({
    name: "MessageLinkEmbeds",
    description: "Embeds message links",
    authors: [{
        name: "ActuallyTheSun",
        id: 406028027768733696n
    }],
    patches: [{
        find: "_messageAttachmentToEmbedMedia",
        replacement: {
            match: /var (.{1,2})=(.{1,2})\.channel,(.{1,2})=.{1,2}\.message,(.{1,2})=.{1,2}\.renderSuppressEmbeds/,
            replace: replacement
        }
    }],

    messageLinkRegex: /https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/((?:\d{17,19}|@me)\/\d{17,19}\/\d{17,19})/,

    getImage(message: Message) {
        if (message.attachments[0] && !message.attachments[0].content_type!.startsWith("video/")) return {
            height: message.attachments[0].height,
            width: message.attachments[0].width,
            url: message.attachments[0].url,
            proxyURL: message.attachments[0].proxy_url!!
        };
        const firstEmbed = message.embeds[0];
        if (!firstEmbed) return null;
        // { url: "https://cdn.discordapp.com/attachments/764071870336598016/1033696245086163005/Untitled.png", proxyURL: "https://cdn.discordapp.com/attachments/764071870336598016/1033696245086163005/Untitled.png" };
        if (firstEmbed.type === "image" || (firstEmbed.type === "rich" && firstEmbed.image))
            return firstEmbed.image ? { ...firstEmbed.image } : { ...firstEmbed.thumbnail };
        if (firstEmbed.type === "gifv" && !firstEmbed.url!.match(/https:\/\/(?:www.)?tenor\.com/)) return {
            height: firstEmbed.thumbnail!.height,
            width: firstEmbed.thumbnail!.width,
            url: firstEmbed.url
        };
        return null;
    },

    generateEmbed(messageURL: string, existingEmbeds: Embed[], originalMessage: { channelID: string, messageID: string; }) {
        const [guildID, channelID, messageID] = messageURL.split("/");
        if (existingEmbeds.find(i => i._isMessageEmbed)) return [...existingEmbeds];
        const message = MessageStore.getMessage(channelID, messageID) || cache[messageID];
        if (existingEmbeds.find(i => i.id === "messageLinkEmbeds-1")) {
            if (!message) return [...existingEmbeds];
            else existingEmbeds = existingEmbeds.filter(i => i.id !== "messageLinkEmbeds-1");
        }
        if (!message) {
            getMessage(channelID, messageID, originalMessage);
            return [...existingEmbeds, {
                author: {
                    name: "Clyde#0000",
                    // TODO: don't hardcode icon url
                    iconURL: "https://discord.com/assets/18126c8a9aafeefa76bbb770759203a9.png",
                    iconProxyURL: "https://discord.com/assets/18126c8a9aafeefa76bbb770759203a9.png"
                },
                rawDescription: "Failed to fetch message",
                id: "messageLinkEmbeds-1",
                fields: [],
                type: "rich"
                // _isMessageEmbed missing is intentional
            }];
        }

        const firstEmbed = message.embeds[0] as Embed;
        const hasActualEmbed = !!(message.author.bot && firstEmbed?.type === "rich" && (!firstEmbed.id || firstEmbed.id.match(/embed_\d+/)));

        const embeds = [...existingEmbeds, {
            author: {
                iconProxyURL: `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${message.author.id}/${message.author.avatar}`,
                iconURL: `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${message.author.id}/${message.author.avatar}`,
                name: `${message.author.username}#${message.author.discriminator}${hasActualEmbed && firstEmbed.author ?
                    ` | ${firstEmbed.author?.name}` : ""}`,
                url: hasActualEmbed ? firstEmbed.author?.url! : undefined,
            },
            color: hasActualEmbed ? firstEmbed.color :
                GuildMemberStore.getMember(guildID, message.author.id)?.colorString,
            image: this.getImage(message),
            rawDescription: hasActualEmbed && firstEmbed.rawDescription.length ? firstEmbed.rawDescription :
                message.content.length ? message.content :
                    `[no content, ${message.attachments.length} attachment${message.attachments.length !== 1 ? "s" : ""}]`,
            footer: {
                text: guildID === "@me" ? "Direct Message" :
                    "#" + ChannelStore.getChannel(channelID).name +
                    ` (${GuildStore.getGuild(guildID).name})${hasActualEmbed && firstEmbed.footer ?
                        ` | ${firstEmbed.footer.text}` : ""}`,
                iconURL: hasActualEmbed ? firstEmbed.footer?.iconURL : undefined,
            },
            rawTitle: hasActualEmbed ? firstEmbed.rawTitle : undefined,
            thumbnail: hasActualEmbed && firstEmbed.thumbnail ? { ...firstEmbed.thumbnail } : undefined,
            timestamp: message.timestamp,
            id: `messageLinkEmbeds-${messageID}`,
            fields: [],
            type: "rich",
            _isMessageEmbed: true
        }];

        return embeds;
    }
});
