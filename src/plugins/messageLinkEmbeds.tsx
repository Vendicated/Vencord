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

import { addAccessory } from "@api/MessageAccessories";
import { Settings } from "@api/settings";
import { Devs } from "@utils/constants.js";
import { Queue } from "@utils/Queue";
import definePlugin, { OptionType } from "@utils/types";
import { filters, findByPropsLazy, waitFor } from "@webpack";
import {
    Button,
    ChannelStore,
    FluxDispatcher,
    GuildStore,
    MessageStore,
    Parser,
    PermissionStore,
    RestAPI,
    Text,
    UserStore
} from "@webpack/common";
import { Channel, Guild, Message } from "discord-types/general";

let messageCache: { [id: string]: { message?: Message, fetched: boolean; }; } = {};

let AutomodEmbed: (...props) => JSX.Element,
    Embed: (...props) => JSX.Element,
    ChannelMessage: (...props) => JSX.Element,
    Endpoints: Record<string, any>;

waitFor(["mle_AutomodEmbed"], m => (AutomodEmbed = m.mle_AutomodEmbed));
waitFor(filters.byCode("().inlineMediaEmbed"), m => Embed = m);
waitFor(m => m.type?.toString()?.includes('["message","compact","className",'), m => ChannelMessage = m);
waitFor(["MESSAGE_CREATE_ATTACHMENT_UPLOAD"], _ => Endpoints = _);
const SearchResultClasses = findByPropsLazy("message", "searchResult");

const messageFetchQueue = new Queue();
function getMessage(channelID: string, messageID: string, originalMessage?: { channelID: string, messageID: string; }): unknown {
    function callback(message: Message | undefined) {
        if (!message) return;
        const actualMessage: Message = MessageStore.getMessages(message.channel_id).receiveMessage(message).get(message.id);
        messageCache[message.id] = {
            message: actualMessage,
            fetched: true
        };
        if (originalMessage) dispatchBlankUpdate(originalMessage.channelID, originalMessage.messageID);
    }

    if (messageID in messageCache && !messageCache[messageID].fetched) return null;
    if (messageCache[messageID]?.fetched) return callback(messageCache[messageID].message);

    messageCache[messageID] = { fetched: false };
    return messageFetchQueue.push(() => RestAPI.get({
        url: Endpoints.MESSAGES(channelID),
        query: {
            limit: 1,
            around: messageID
        },
        retries: 2
    }).then(res =>
        callback(res.body?.[0])
    ).catch(() => { }));
}

function dispatchBlankUpdate(channelID: string, messageID: string): void {
    FluxDispatcher.dispatch({
        type: "MESSAGE_UPDATE",
        message: {
            guild_id: ChannelStore.getChannel(channelID)?.guild_id,
            channel_id: channelID,
            id: messageID,
        }
    });
}

interface Attachment {
    height: number;
    width: number;
    url: string;
    proxyURL?: string;
}

const isTenorGif = /https:\/\/(?:www.)?tenor\.com/;
function getImages(message: Message): Attachment[] {
    const attachments: Attachment[] = [];
    message.attachments?.forEach(a => {
        if (a.content_type!.startsWith("image/")) attachments.push({
            height: a.height!,
            width: a.width!,
            url: a.url,
            proxyURL: a.proxy_url!
        });
    });
    message.embeds?.forEach(e => {
        if (e.type === "image") attachments.push(
            e.image ? { ...e.image } : { ...e.thumbnail! }
        );
        if (e.type === "gifv" && !isTenorGif.test(e.url!)) {
            attachments.push({
                height: e.thumbnail!.height,
                width: e.thumbnail!.width,
                url: e.url!
            });
        }
    });
    return attachments;
}

const noContent = (attachments: number, embeds: number): string => {
    if (!attachments && !embeds) return "";
    if (!attachments) return `[no content, ${embeds} embed${embeds !== 1 ? "s" : ""}]`;
    if (!embeds) return `[no content, ${attachments} attachment${attachments !== 1 ? "s" : ""}]`;
    return `[no content, ${attachments} attachment${attachments !== 1 ? "s" : ""} and ${embeds} embed${embeds !== 1 ? "s" : ""}]`;
};

function requiresRichEmbed(message: Message) {
    if (message.attachments.every(a => a.content_type?.startsWith("image/"))
        && message.embeds.every(e => e.type === "image" || (e.type === "gifv" && !isTenorGif.test(e.url!)))
        && !message.components.length
    ) return false;
    return true;
}

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

interface MessageEmbedProps {
    message: Message;
    channel: Channel;
    guildID: string;
}

export default definePlugin({
    name: "MessageLinkEmbeds",
    description: "Adds a preview to messages that link another message",
    authors: [Devs.TheSun],
    dependencies: ["MessageAccessoriesAPI"],
    patches: [
        {
            find: "().embedCard",
            replacement: [{
                match: /{"use strict";(.{0,10})\(\)=>(.{1,2})}\);/,
                replace: '{"use strict";$1()=>$2,me:()=>messageEmbed});'
            }, {
                match: /function (.{1,2})\((.{1,2})\){var (.{1,2})=.{1,2}\.message,(.{1,2})=.{1,2}\.channel(.{0,300})\(\)\.embedCard(.{0,500})}\)}/,
                replace: "function $1($2){var $3=$2.message,$4=$2.channel$5().embedCard$6})}\
var messageEmbed={mle_AutomodEmbed:$1};"
            }]
        }
    ],
    options: {
        messageBackgroundColor: {
            description: "Background color for messages in rich embeds",
            type: OptionType.BOOLEAN
        },
        automodEmbeds: {
            description: "Use automod embeds instead of rich embeds (smaller but less info)",
            type: OptionType.SELECT,
            options: [{
                label: "Always use automod embeds",
                value: "always"
            }, {
                label: "Prefer automod embeds, but use rich embeds if some content can't be shown",
                value: "prefer"
            }, {
                label: "Never use automod embeds",
                value: "never",
                default: true
            }]
        },
        clearMessageCache: {
            type: OptionType.COMPONENT,
            description: "Clear the linked message cache",
            component: () =>
                <Button onClick={() => messageCache = {}}>
                    Clear the linked message cache
                </Button>
        }
    },

    start() {
        addAccessory("messageLinkEmbed", props => this.messageEmbedAccessory(props) as JSX.Element, 4 /* just above rich embeds*/);
    },

    messageLinkRegex: /(?<!<)https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/(\d{17,19}|@me)\/(\d{17,19})\/(\d{17,19})/,

    messageEmbedAccessory(props) {
        const { message } = props;

        const [_, guildID, channelID, messageID] = message.content?.match(this.messageLinkRegex) ?? [];
        if (!messageID) return null;

        const linkedChannel = ChannelStore.getChannel(channelID);
        if (!linkedChannel || (guildID !== "@me" && !PermissionStore.can(1024n /* view channel */, linkedChannel))) {
            return null;
        }
        let linkedMessage = messageCache[messageID]?.message as Message;
        if (!linkedMessage) {
            linkedMessage ??= MessageStore.getMessage(channelID, messageID);
            if (linkedMessage) messageCache[messageID] = { message: linkedMessage, fetched: true };
            else {
                getMessage(channelID, messageID, { channelID: message.channel_id, messageID: message.id });
                return null;
            }
        }
        const meProps: MessageEmbedProps = {
            message: linkedMessage,
            channel: linkedChannel,
            guildID
        };
        switch (Settings.plugins[this.name].automodEmbeds) {
            case "always":
                return this.automodEmbedAccessory(meProps);
            case "prefer":
                if (requiresRichEmbed(meProps.message)) return this.channelMessageEmbedAccessory(meProps);
                else return this.automodEmbedAccessory(meProps);
            case "never":
            default:
                return this.channelMessageEmbedAccessory(meProps);
        }
    },

    channelMessageEmbedAccessory(props: MessageEmbedProps): JSX.Element | null {
        const { message, channel, guildID } = props;

        const isDM = guildID === "@me";
        const guild = !isDM && GuildStore.getGuild(channel.guild_id);
        const dmReceiver = UserStore.getUser(ChannelStore.getChannel(channel.id).recipients?.[0]);
        const classNames = [SearchResultClasses.message];
        if (Settings.plugins[this.name].messageBackgroundColor) classNames.push(SearchResultClasses.searchResult);

        return <Embed
            embed={{
                rawDescription: "",
                color: "var(--background-secondary)",
                author: {
                    name: <Text variant="text-xs/medium" tag="span">
                        {[
                            <span>{isDM ? "Direct Message - " : (guild as Guild).name + " - "}</span>,
                            ...(isDM
                                ? Parser.parse(`<@${dmReceiver.id}>`)
                                : Parser.parse(`<#${channel.id}>`)
                            )
                        ]}
                    </Text>,
                    iconProxyURL: guild
                        ? `https://${window.GLOBAL_ENV.CDN_HOST}/icons/${guild.id}/${guild.icon}.png`
                        : `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${dmReceiver.id}/${dmReceiver.avatar}`
                }
            }}
            renderDescription={() => {
                return <div key={message.id} className={classNames.join(" ")} >
                    <ChannelMessage
                        id={`message-link-embeds-${message.id}`}
                        message={message}
                        channel={channel}
                        subscribeToComponentDispatch={false}
                    />
                </div >;
            }}
        />;
    },

    automodEmbedAccessory(props: MessageEmbedProps): JSX.Element | null {
        const { message, channel, guildID } = props;

        const isDM = guildID === "@me";
        const images = getImages(message);
        const { parse } = Parser;

        return <AutomodEmbed
            channel={channel}
            childrenAccessories={<Text color="text-muted" variant="text-xs/medium" tag="span">
                {[
                    ...(isDM ? parse(`<@${ChannelStore.getChannel(channel.id).recipients[0]}>`) : parse(`<#${channel.id}>`)),
                    <span>{isDM ? " - Direct Message" : " - " + GuildStore.getGuild(channel.guild_id)?.name}</span>
                ]}
            </Text>}
            compact={false}
            content={[
                ...(message.content || !(message.attachments.length > images.length)
                    ? parse(message.content)
                    : [noContent(message.attachments.length, message.embeds.length)]
                ),
                ...(images.map<JSX.Element>(a => {
                    const { width, height } = computeWidthAndHeight(a.width, a.height);
                    return <div><img src={a.url} width={width} height={height} /></div>;
                }
                ))
            ]}
            hideTimestamp={false}
            message={message}
            _messageEmbed="automod"
        />;
    },
});
