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

import { addAccessory, removeAccessory } from "../api/MessageAccessories";
import { lazy, lazyWebpack } from "../utils/misc";
import definePlugin from "../utils/types";
import { filters, find, waitFor } from "../webpack";
import { ChannelStore, FluxDispatcher, GuildMemberStore, GuildStore, MessageStore, React } from "../webpack/common";

const replacement = `
const msgLink = $2.message.content?.match(Vencord.Plugins.plugins.MessageLinkEmbeds.messageLinkRegex)?.[1];

if (msgLink) {
    $2.message.embeds = [
        ...Vencord.Plugins.plugins.MessageLinkEmbeds
        .generateRichEmbed(msgLink, $2.message.embeds,
            { channelID: $2.message.channel_id, messageID: $2.message.id }
        )
    ].filter(item => item);
};

var
  $1 = $2.channel,
  $3 = $2.message,
  $4 = $2.renderSuppressEmbeds /* Don't add a semicolon here, there are more definitions after this. */
`.trim().replace(/(?<=[^(?:const)|(?:var)])\s+/gm, "");

const messageCache: { [id: string]: { message?: Message, fetched: boolean; }; } = {};
const elementCache: { [id: string]: { element: JSX.Element, shouldRenderRichEmbed: boolean; }; } = {};

let get: (...query) => Promise<any>,
    MessageEmbed: (...props) => JSX.Element,
    parse: (content: string) => any[] /* (JSX.Element | string)[] i think */;
waitFor(["get", "getAPIBaseURL"], _ => ({ get } = _));
waitFor(["MessageEmbed"], _ => ({ MessageEmbed } = _));
waitFor(["parse", "parseTopic"], _ => ({ parse } = _));
const Endpoints = lazyWebpack(filters.byProps(["MESSAGE_CREATE_ATTACHMENT_UPLOAD"]));
const TextContainer = lazy(() => find(filters.byCode('case"always-white":')));

function getMessage(channelID: string, messageID: string, originalMessage?: { channelID: string, messageID: string; }): unknown {
    function callback(message: any) {
        if (!message) return;
        const actualMessage: Message = (MessageStore.getMessages(message.channel_id) as any).receiveMessage(message).get(message.id);
        messageCache[message.id] = {
            message: actualMessage,
            fetched: true
        };
        if (originalMessage) dispatchBlankUpdate(originalMessage.channelID, originalMessage.messageID);
    }
    if (messageID in messageCache && !messageCache[messageID].fetched) return null;
    if (messageCache[messageID]?.fetched) return callback(messageCache[messageID].message);
    messageCache[messageID] = { fetched: false };
    return get({
        url: Endpoints.MESSAGES(channelID),
        query: {
            limit: 1,
            around: messageID
        },
        retries: 2
    }).then(res =>
        callback(res.body?.[0])
    ).catch(console.log);
}

function dispatchBlankUpdate(channelID: string, messageID: string): void {
    FluxDispatcher.dispatch({
        type: "MESSAGE_UPDATE",
        message: {
            guild_id: ChannelStore.getChannel(channelID).guild_id,
            channel_id: channelID,
            id: messageID,
        }
    });
}

interface Embed extends _Embed {
    _messageEmbed?: "rich" | "clyde", /* can't be an automod embed because that's an accessory */
    footer?: {
        text: string,
        iconURL?: string;
    },
    timestamp?: moment.Moment;
}

const noContent = (attachments: number, embeds: number): string => {
    if (!attachments && !embeds) return "";
    if (!attachments) return `[no content, ${embeds} embed${embeds !== 1 ? "s" : ""}]`;
    if (!embeds) return `[no content, ${attachments} attachment${attachments !== 1 ? "s" : ""}]`;
    return `[no content, ${attachments} attachment${attachments !== 1 ? "s" : ""} and ${embeds} embed${embeds !== 1 ? "s" : ""}]`;
};

const computeWidthAndHeight = (width: number, height: number) => {
    const maxWidth = 400, maxHeight = 300;
    let newWidth: number, newHeight: number;
    if (width > height) {
        newWidth = Math.min(width, maxWidth);
        newHeight = Math.round(height / (width / newWidth));
    } else {
        newHeight = Math.min(height, maxHeight);
        newWidth = Math.round(width / (height / newHeight));
    }
    return { width: newWidth, height: newHeight };
};

export default definePlugin({
    name: "MessageLinkEmbeds",
    description: "Embeds message links",
    authors: [{
        name: "ActuallyTheSun",
        id: 406028027768733696n
    }],
    dependencies: ["MessageAccessoriesAPI"],
    patches: [{
        find: "_messageAttachmentToEmbedMedia",
        replacement: {
            match: /var (.{1,2})=(.{1,2})\.channel,(.{1,2})=.{1,2}\.message,(.{1,2})=.{1,2}\.renderSuppressEmbeds/,
            replace: replacement
        }
    },
    {
        find: "().embedCard",
        replacement: [{
            match: /{"use strict";(.{0,10})\(\)=>(.{1,2})}\);/,
            replace: '{"use strict";$1()=>$2,me:()=>messageEmbed});'
        }, {
            match: /function (.{1,2})\((.{1,2})\){var (.{1,2})=.{1,2}\.message,(.{1,2})=.{1,2}\.channel(.{0,300})\(\)\.embedCard(.{0,500})}\)\)\)}/,
            replace: "function $1($2){var $3=$2.message,$4=$2.channel$5().embedCard$6})))}\
            var messageEmbed={MessageEmbed:$1};"
        }]
    }],

    start() {
        addAccessory("messageLinkEmbed", props => this.messageEmbedAccessory(props), 4 /* just above rich embeds*/);
    },

    stop() {
        // requires a restart to remove the rich embeds because that's not an accessory
        // and even if they were removed all messages keep their embeds until rerendered
        // is there a point in having a stop function?
        removeAccessory("messageLinkEmbed");
    },

    messageLinkRegex: /https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/((?:\d{17,19}|@me)\/\d{17,19}\/\d{17,19})/,

    messageEmbedAccessory(props: Record<string, any>): JSX.Element {
        const { message } = props;
        const Nothing = React.createElement("Fragment", {}, null);

        const msgLink = message.content?.match(this.messageLinkRegex)?.[1];
        if (!msgLink) return Nothing;
        const [guildID, channelID, messageID] = msgLink.split("/");
        if (messageID in elementCache) return elementCache[messageID].element;
        const linkedMessage = MessageStore.getMessage(channelID, messageID) || messageCache[messageID]?.message;
        if (!linkedMessage) {
            getMessage(channelID, messageID, { channelID: message.channel_id, messageID: message.id });
            return Nothing;
        }
        const linkedChannel = ChannelStore.getChannel(channelID);
        const isDM = guildID === "@me";
        const image = this.getImage(linkedMessage);
        const hasActualEmbed = (linkedMessage.author.bot && linkedMessage.embeds[0]?.type === "rich" && !(linkedMessage.embeds[0] as Embed)._messageEmbed);
        if (hasActualEmbed && !linkedMessage.content) {
            elementCache[linkedMessage.id] = {
                element: Nothing,
                shouldRenderRichEmbed: true
            };
            return Nothing;
        }

        const MessageEmbedElement = React.createElement(MessageEmbed, {
            channel: linkedChannel,
            childrenAccessories: React.createElement(TextContainer(), {
                color: "text-muted",
                tag: "span",
                variant: "text-xs/medium"
            }, [
                ...(isDM ? parse(`<@${ChannelStore.getChannel(linkedChannel.id).recipients[0]}>`) : parse(`<#${linkedChannel.id}>`)),
                React.createElement("span", {}, isDM ? " - Direct Message" : " - " + GuildStore.getGuild(linkedChannel.guild_id)?.name)
            ]),
            compact: false,
            content: [
                ...(linkedMessage.content ?
                    parse(linkedMessage.content) :
                    [noContent(linkedMessage.attachments.length, linkedMessage.embeds.length)]
                ),
                // separator
                (image) ? React.createElement("div", {}, null) : null,
                image ? React.createElement("img", {
                    src: image.url,
                    width: computeWidthAndHeight(image.width!, image.height!).width,
                    height: computeWidthAndHeight(image.width!, image.height!).height
                }) : null
            ].filter(i => i),
            hideTimestamp: false,
            message: linkedMessage,
            _messageEmbed: "automod"
        }, null);

        elementCache[linkedMessage.id] = {
            element: MessageEmbedElement,
            shouldRenderRichEmbed: hasActualEmbed
        };
        // dispatch needed here because it otherwise shows both the automod and rich embed
        dispatchBlankUpdate(message.channel_id, message.id);
        return MessageEmbedElement;
    },

    getImage(message: Message) {
        if (message.attachments[0] && !message.attachments[0].content_type!.startsWith("video/")) return {
            height: message.attachments[0].height,
            width: message.attachments[0].width,
            url: message.attachments[0].url,
            proxyURL: message.attachments[0].proxy_url!!
        };
        const firstEmbed = message.embeds[0];
        if (!firstEmbed) return null;
        if (firstEmbed.type === "image" || (firstEmbed.type === "rich" && firstEmbed.image))
            return firstEmbed.image ? { ...firstEmbed.image } : { ...firstEmbed.thumbnail };
        if (firstEmbed.type === "gifv" && !firstEmbed.url!.match(/https:\/\/(?:www.)?tenor\.com/)) return {
            height: firstEmbed.thumbnail!.height,
            width: firstEmbed.thumbnail!.width,
            url: firstEmbed.url
        };
        return null;
    },

    generateRichEmbed(messageURL: string, existingEmbeds: Embed[], originalMessage: { channelID: string, messageID: string; }) {
        const [guildID, channelID, messageID] = messageURL.split("/");
        if (elementCache[messageID] && !elementCache[messageID]?.shouldRenderRichEmbed) return [...existingEmbeds.filter(i => i._messageEmbed !== "rich")];
        if (existingEmbeds.find(i => i._messageEmbed === "rich")) return [...existingEmbeds];
        const message = MessageStore.getMessage(channelID, messageID) || messageCache[messageID]?.message;
        if (existingEmbeds.find(i => i._messageEmbed === "clyde")) {
            if (!message) return [...existingEmbeds];
            else existingEmbeds = existingEmbeds.filter(i => i.id !== "messageLinkEmbeds-1");
        }
        if (!message) {
            getMessage(channelID, messageID, originalMessage);
            return [...existingEmbeds, {
                author: {
                    name: "Clyde#0000",
                    // the only place where this is found in discord's code is a webpack module
                    // with the sole purpose of exporting the image
                    // there is absolutely nothing to find it by other than the randomized string
                    iconURL: "https://discord.com/assets/18126c8a9aafeefa76bbb770759203a9.png",
                    iconProxyURL: "https://discord.com/assets/18126c8a9aafeefa76bbb770759203a9.png"
                },
                rawDescription: "Failed to fetch message",
                id: "messageLinkEmbeds-1",
                fields: [],
                type: "rich",
                _messageEmbed: "clyde"
            }] as Embed[];
        }

        const firstEmbed = message.embeds[0] as Embed;
        const hasActualEmbed = !!(message.author.bot && firstEmbed?.type === "rich" && firstEmbed.id.match(/embed_\d+/));
        if (hasActualEmbed && message.content) return [...existingEmbeds, { ...firstEmbed, _messageEmbed: "rich" }];

        const usernameAndDiscriminator = `${message.author.username}#${message.author.discriminator}`;
        const channelAndServer = guildID === "@me" ? "Direct Message" :
            "#" + ChannelStore.getChannel(channelID).name + ` (${GuildStore.getGuild(guildID).name})`;

        const embeds = [...existingEmbeds, {
            author: {
                iconProxyURL: `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${message.author.id}/${message.author.avatar}`,
                iconURL: `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${message.author.id}/${message.author.avatar}`,
                name: hasActualEmbed ?
                    `${usernameAndDiscriminator}${firstEmbed.author ? ` | ${firstEmbed.author.name}` : ""}`
                    : usernameAndDiscriminator,
                url: hasActualEmbed ? firstEmbed.author?.url! : undefined,
            },
            color: hasActualEmbed ? firstEmbed.color :
                GuildMemberStore.getMember(guildID, message.author.id)?.colorString,
            image: this.getImage(message),
            rawDescription: hasActualEmbed && firstEmbed.rawDescription.length ? firstEmbed.rawDescription :
                message.content.length ? message.content :
                    noContent(message.attachments.length, message.embeds.length),
            footer: {
                text: hasActualEmbed
                    ? `${channelAndServer}${firstEmbed.footer ? ` | ${firstEmbed.footer.text}` : ""}`
                    : channelAndServer,
                iconURL: hasActualEmbed ? firstEmbed.footer?.iconURL : undefined,
            },
            rawTitle: hasActualEmbed ? firstEmbed.rawTitle : undefined,
            thumbnail: hasActualEmbed && firstEmbed.thumbnail ? { ...firstEmbed.thumbnail } : undefined,
            timestamp: message.timestamp,
            id: `messageLinkEmbeds-${messageID}`,
            fields: [],
            type: "rich",
            _messageEmbed: "rich"
        }] as Embed[];

        return embeds;
    }
});
