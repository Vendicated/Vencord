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
import { definePluginSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants.js";
import { classes, LazyComponent } from "@utils/misc";
import { Queue } from "@utils/Queue";
import definePlugin, { OptionType } from "@utils/types";
import { find, findByCode, findByPropsLazy } from "@webpack";
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

const messageCache = new Map<string, {
    message?: Message;
    fetched: boolean;
}>();

const Embed = LazyComponent(() => findByCode(".inlineMediaEmbed"));
const ChannelMessage = LazyComponent(() => find(m => m.type?.toString()?.includes('["message","compact","className",')));

const SearchResultClasses = findByPropsLazy("message", "searchResult");

let AutoModEmbed: React.ComponentType<any> = () => null;

const messageLinkRegex = /(?<!<)https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/(\d{17,20}|@me)\/(\d{17,20})\/(\d{17,20})/g;
const tenorRegex = /https:\/\/(?:www.)?tenor\.com/;

interface Attachment {
    height: number;
    width: number;
    url: string;
    proxyURL?: string;
}

interface MessageEmbedProps {
    message: Message;
    channel: Channel;
    guildID: string;
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
    clearMessageCache: {
        type: OptionType.COMPONENT,
        description: "Clear the linked message cache",
        component: () =>
            <Button onClick={() => messageCache.clear()}>
                Clear the linked message cache
            </Button>
    }
});


async function fetchMessage(channelID: string, messageID: string) {
    const cached = messageCache.get(messageID);
    if (cached) return cached.message;

    messageCache.set(messageID, { fetched: false });

    const res = await RestAPI.get({
        url: `/channels/${channelID}/messages`,
        query: {
            limit: 1,
            around: messageID
        },
        retries: 2
    }).catch(() => null);

    const msg = res?.body?.[0];
    if (!msg) return;

    const message: Message = MessageStore.getMessages(msg.channel_id).receiveMessage(msg).get(msg.id);

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

    let match = null as RegExpMatchArray | null;
    while ((match = messageLinkRegex.exec(message.content!)) !== null) {
        const [_, guildID, channelID, messageID] = match;
        if (embeddedBy.includes(messageID)) {
            continue;
        }

        const linkedChannel = ChannelStore.getChannel(channelID);
        if (!linkedChannel || (guildID !== "@me" && !PermissionStore.can(1024n /* view channel */, linkedChannel))) {
            continue;
        }

        let linkedMessage = messageCache.get(messageID)?.message;
        if (!linkedMessage) {
            linkedMessage ??= MessageStore.getMessage(channelID, messageID);
            if (linkedMessage) {
                messageCache.set(messageID, { message: linkedMessage, fetched: true });
            } else {
                const msg = { ...message } as any;
                delete msg.embeds;
                messageFetchQueue.push(() => fetchMessage(channelID, messageID)
                    .then(m => m && FluxDispatcher.dispatch({
                        type: "MESSAGE_UPDATE",
                        message: msg
                    }))
                );
                continue;
            }
        }

        const messageProps: MessageEmbedProps = {
            message: withEmbeddedBy(linkedMessage, [...embeddedBy, message.id]),
            channel: linkedChannel,
            guildID
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

function ChannelMessageEmbedAccessory({ message, channel, guildID }: MessageEmbedProps): JSX.Element | null {
    const isDM = guildID === "@me";

    const guild = !isDM && GuildStore.getGuild(channel.guild_id);
    const dmReceiver = UserStore.getUser(ChannelStore.getChannel(channel.id).recipients?.[0]);


    return <Embed
        embed={{
            rawDescription: "",
            color: "var(--background-secondary)",
            author: {
                name: <Text variant="text-xs/medium" tag="span">
                    <span>{isDM ? "Direct Message - " : (guild as Guild).name + " - "}</span>
                    {isDM
                        ? Parser.parse(`<@${dmReceiver.id}>`)
                        : Parser.parse(`<#${channel.id}>`)
                    }
                </Text>,
                iconProxyURL: guild
                    ? `https://${window.GLOBAL_ENV.CDN_HOST}/icons/${guild.id}/${guild.icon}.png`
                    : `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${dmReceiver.id}/${dmReceiver.avatar}`
            }
        }}
        renderDescription={() => (
            <div key={message.id} className={classes(SearchResultClasses.message, settings.store.messageBackgroundColor && SearchResultClasses.searchResult)}>
                <ChannelMessage
                    id={`message-link-embeds-${message.id}`}
                    message={message}
                    channel={channel}
                    subscribeToComponentDispatch={false}
                />
            </div>
        )}
    />;
}

function AutomodEmbedAccessory(props: MessageEmbedProps): JSX.Element | null {
    const { message, channel, guildID } = props;

    const isDM = guildID === "@me";
    const images = getImages(message);
    const { parse } = Parser;

    return <AutoModEmbed
        channel={channel}
        childrenAccessories={
            <Text color="text-muted" variant="text-xs/medium" tag="span">
                {isDM
                    ? parse(`<@${ChannelStore.getChannel(channel.id).recipients[0]}>`)
                    : parse(`<#${channel.id}>`)
                }
                <span>{isDM ? " - Direct Message" : " - " + GuildStore.getGuild(channel.guild_id)?.name}</span>
            </Text>
        }
        compact={false}
        content={
            <>
                {message.content || message.attachments.length <= images.length
                    ? parse(message.content)
                    : [noContent(message.attachments.length, message.embeds.length)]
                }
                {images.map(a => {
                    const { width, height } = computeWidthAndHeight(a.width, a.height);
                    return (
                        <div>
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
    authors: [Devs.TheSun, Devs.Ven],
    dependencies: ["MessageAccessoriesAPI"],
    patches: [
        {
            find: ".embedCard",
            replacement: [{
                match: /function (\i)\(\i\){var \i=\i\.message,\i=\i\.channel.{0,200}\.hideTimestamp/,
                replace: "$self.AutoModEmbed=$1;$&"
            }]
        }
    ],

    set AutoModEmbed(e: any) {
        AutoModEmbed = e;
    },

    settings,

    start() {
        addAccessory("messageLinkEmbed", props => {
            if (!messageLinkRegex.test(props.message.content))
                return null;

            // need to reset the regex because it's global
            messageLinkRegex.lastIndex = 0;

            return (
                <ErrorBoundary>
                    <MessageEmbedAccessory message={props.message} />
                </ErrorBoundary>
            );
        }, 4 /* just above rich embeds */);
    },
});
