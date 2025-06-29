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

import { addMessageAccessory, removeMessageAccessory } from "@api/MessageAccessories";
import { updateMessage } from "@api/MessageUpdater";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Devs } from "@utils/constants.js";
import { classes } from "@utils/misc";
import { Queue } from "@utils/Queue";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import {
    Button,
    ChannelStore,
    Constants,
    GuildStore,
    IconUtils,
    MessageStore,
    Parser,
    PermissionsBits,
    PermissionStore,
    RestAPI,
    Text,
    UserStore
} from "@webpack/common";
import { Channel, Message } from "discord-types/general";
import { JSX } from "react";

const messageCache = new Map<string, {
    message?: Message;
    fetched: boolean;
}>();

const Embed = findComponentByCodeLazy(".inlineMediaEmbed");
const AutoModEmbed = findComponentByCodeLazy(".withFooter]:", "childrenMessageContent:");
const ChannelMessage = findComponentByCodeLazy("childrenExecutedCommand:", ".hideAccessories");

const SearchResultClasses = findByPropsLazy("message", "searchResult");
const EmbedClasses = findByPropsLazy("embedAuthorIcon", "embedAuthor", "embedAuthor");

const MessageDisplayCompact = getUserSettingLazy("textAndImages", "messageDisplayCompact")!;

const messageLinkRegex = /(?<!<)https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/(?:\d{17,20}|@me)\/(\d{17,20})\/(\d{17,20})/g;
const tenorRegex = /^https:\/\/(?:www\.)?tenor\.com\//;

interface Attachment {
    height: number;
    width: number;
    url: string;
    proxyURL?: string;
}

interface MessageEmbedProps {
    message: Message;
    channel: Channel;
}

const messageFetchQueue = new Queue();

const settings = definePluginSettings({
    messageBackgroundColor: {
        description: "Background color for messages in rich embeds",
        type: OptionType.BOOLEAN
    },
    automodEmbeds: {
        description: "Use automod embeds instead of rich embeds (smaller but less info)",
        type: OptionType.SELECT,
        options: [
            {
                label: "Always use automod embeds",
                value: "always"
            },
            {
                label: "Prefer automod embeds, but use rich embeds if some content can't be shown",
                value: "prefer"
            },
            {
                label: "Never use automod embeds",
                value: "never",
                default: true
            }
        ]
    },
    listMode: {
        description: "Whether to use ID list as blacklist or whitelist",
        type: OptionType.SELECT,
        options: [
            {
                label: "Blacklist",
                value: "blacklist",
                default: true
            },
            {
                label: "Whitelist",
                value: "whitelist"
            }
        ]
    },
    idList: {
        description: "Guild/channel/user IDs to blacklist or whitelist (separate with comma)",
        type: OptionType.STRING,
        default: ""
    },
    clearMessageCache: {
        type: OptionType.COMPONENT,
        component: () => (
            <Button onClick={() => messageCache.clear()}>
                Clear the linked message cache
            </Button>
        )
    }
});


async function fetchMessage(channelID: string, messageID: string) {
    const cached = messageCache.get(messageID);
    if (cached) return cached.message;

    messageCache.set(messageID, { fetched: false });

    const res = await RestAPI.get({
        url: Constants.Endpoints.MESSAGES(channelID),
        query: {
            limit: 1,
            around: messageID
        },
        retries: 2
    }).catch(() => null);

    const msg = res?.body?.[0];
    if (!msg) return;

    const message: Message = MessageStore.getMessages(msg.channel_id).receiveMessage(msg).get(msg.id);
    if (!message) return;

    messageCache.set(message.id, {
        message,
        fetched: true
    });

    return message;
}


function getImages(message: Message): Attachment[] {
    const attachments: Attachment[] = [];

    for (const { content_type, height, width, url, proxy_url } of message.attachments ?? []) {
        if (content_type?.startsWith("image/"))
            attachments.push({
                height: height!,
                width: width!,
                url: url,
                proxyURL: proxy_url!
            });
    }

    for (const { type, image, thumbnail, url } of message.embeds ?? []) {
        if (type === "image")
            attachments.push({ ...(image ?? thumbnail!) });
        else if (url && type === "gifv" && !tenorRegex.test(url))
            attachments.push({
                height: thumbnail!.height,
                width: thumbnail!.width,
                url
            });
    }

    return attachments;
}

function noContent(attachments: number, embeds: number) {
    if (!attachments && !embeds) return "";
    if (!attachments) return `[no content, ${embeds} embed${embeds !== 1 ? "s" : ""}]`;
    if (!embeds) return `[no content, ${attachments} attachment${attachments !== 1 ? "s" : ""}]`;
    return `[no content, ${attachments} attachment${attachments !== 1 ? "s" : ""} and ${embeds} embed${embeds !== 1 ? "s" : ""}]`;
}

function requiresRichEmbed(message: Message) {
    if (message.components.length) return true;
    if (message.attachments.some(a => !a.content_type?.startsWith("image/"))) return true;
    if (message.embeds.some(e => e.type !== "image" && (e.type !== "gifv" || tenorRegex.test(e.url!)))) return true;

    return false;
}

function computeWidthAndHeight(width: number, height: number) {
    const maxWidth = 400;
    const maxHeight = 300;

    if (width > height) {
        const adjustedWidth = Math.min(width, maxWidth);
        return { width: adjustedWidth, height: Math.round(height / (width / adjustedWidth)) };
    }

    const adjustedHeight = Math.min(height, maxHeight);
    return { width: Math.round(width / (height / adjustedHeight)), height: adjustedHeight };
}

function withEmbeddedBy(message: Message, embeddedBy: string[]) {
    return new Proxy(message, {
        get(_, prop) {
            if (prop === "vencordEmbeddedBy") return embeddedBy;
            // @ts-ignore ts so bad
            return Reflect.get(...arguments);
        }
    });
}


function MessageEmbedAccessory({ message }: { message: Message; }) {
    // @ts-ignore
    const embeddedBy: string[] = message.vencordEmbeddedBy ?? [];

    const accessories = [] as (JSX.Element | null)[];

    for (const [_, channelID, messageID] of message.content!.matchAll(messageLinkRegex)) {
        if (embeddedBy.includes(messageID) || embeddedBy.length > 2) {
            continue;
        }

        const linkedChannel = ChannelStore.getChannel(channelID);
        if (!linkedChannel || (!linkedChannel.isPrivate() && !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, linkedChannel))) {
            continue;
        }

        const { listMode, idList } = settings.store;

        const isListed = [linkedChannel.guild_id, channelID, message.author.id].some(id => id && idList.includes(id));

        if (listMode === "blacklist" && isListed) continue;
        if (listMode === "whitelist" && !isListed) continue;

        let linkedMessage = messageCache.get(messageID)?.message;
        if (!linkedMessage) {
            linkedMessage ??= MessageStore.getMessage(channelID, messageID);
            if (linkedMessage) {
                messageCache.set(messageID, { message: linkedMessage, fetched: true });
            } else {

                messageFetchQueue.unshift(() => fetchMessage(channelID, messageID)
                    .then(m => m && updateMessage(message.channel_id, message.id))
                );
                continue;
            }
        }

        const messageProps: MessageEmbedProps = {
            message: withEmbeddedBy(linkedMessage, [...embeddedBy, message.id]),
            channel: linkedChannel
        };

        const type = settings.store.automodEmbeds;
        accessories.push(
            type === "always" || (type === "prefer" && !requiresRichEmbed(linkedMessage))
                ? <AutomodEmbedAccessory {...messageProps} />
                : <ChannelMessageEmbedAccessory {...messageProps} />
        );
    }

    return accessories.length ? <>{accessories}</> : null;
}

function getChannelLabelAndIconUrl(channel: Channel) {
    if (channel.isDM()) return ["Direct Message", IconUtils.getUserAvatarURL(UserStore.getUser(channel.recipients[0]))];
    if (channel.isGroupDM()) return ["Group DM", IconUtils.getChannelIconURL(channel)];
    return ["Server", IconUtils.getGuildIconURL(GuildStore.getGuild(channel.guild_id))];
}

function ChannelMessageEmbedAccessory({ message, channel }: MessageEmbedProps): JSX.Element | null {
    const compact = MessageDisplayCompact.useSetting();

    const dmReceiver = UserStore.getUser(ChannelStore.getChannel(channel.id).recipients?.[0]);

    const [channelLabel, iconUrl] = getChannelLabelAndIconUrl(channel);

    return (
        <Embed
            embed={{
                rawDescription: "",
                color: "var(--background-base-lower)",
                author: {
                    name: <Text variant="text-xs/medium" tag="span">
                        <span>{channelLabel} - </span>
                        {Parser.parse(channel.isDM() ? `<@${dmReceiver.id}>` : `<#${channel.id}>`)}
                    </Text>,
                    iconProxyURL: iconUrl
                }
            }}
            renderDescription={() => (
                <div key={message.id} className={classes(SearchResultClasses.message, settings.store.messageBackgroundColor && SearchResultClasses.searchResult)}>
                    <ChannelMessage
                        id={`message-link-embeds-${message.id}`}
                        message={message}
                        channel={channel}
                        subscribeToComponentDispatch={false}
                        compact={compact}
                    />
                </div>
            )}
        />
    );
}

function AutomodEmbedAccessory(props: MessageEmbedProps): JSX.Element | null {
    const { message, channel } = props;
    const compact = MessageDisplayCompact.useSetting();
    const images = getImages(message);
    const { parse } = Parser;

    const [channelLabel, iconUrl] = getChannelLabelAndIconUrl(channel);

    return <AutoModEmbed
        channel={channel}
        childrenAccessories={
            <Text color="text-muted" variant="text-xs/medium" tag="span" className={`${EmbedClasses.embedAuthor} ${EmbedClasses.embedMargin}`}>
                {iconUrl && <img src={iconUrl} className={EmbedClasses.embedAuthorIcon} alt="" />}
                <span>
                    <span>{channelLabel} - </span>
                    {channel.isDM()
                        ? Parser.parse(`<@${ChannelStore.getChannel(channel.id).recipients[0]}>`)
                        : Parser.parse(`<#${channel.id}>`)
                    }
                </span>
            </Text>
        }
        compact={compact}
        content={
            <>
                {message.content || message.attachments.length <= images.length
                    ? parse(message.content)
                    : [noContent(message.attachments.length, message.embeds.length)]
                }
                {images.map((a, idx) => {
                    const { width, height } = computeWidthAndHeight(a.width, a.height);
                    return (
                        <div key={idx}>
                            <img src={a.url} width={width} height={height} />
                        </div>
                    );
                })}
            </>
        }
        hideTimestamp={false}
        message={message}
        _messageEmbed="automod"
    />;
}

export default definePlugin({
    name: "MessageLinkEmbeds",
    description: "Adds a preview to messages that link another message",
    authors: [Devs.TheSun, Devs.Ven, Devs.RyanCaoDev],
    dependencies: ["MessageAccessoriesAPI", "MessageUpdaterAPI", "UserSettingsAPI"],

    settings,

    start() {
        addMessageAccessory("MessageLinkEmbeds", props => {
            if (!messageLinkRegex.test(props.message.content))
                return null;

            // need to reset the regex because it's global
            messageLinkRegex.lastIndex = 0;

            return (
                <MessageEmbedAccessory
                    message={props.message}
                />
            );
        }, 4 /* just above rich embeds */);
    },

    stop() {
        removeMessageAccessory("MessageLinkEmbeds");
    }
});
