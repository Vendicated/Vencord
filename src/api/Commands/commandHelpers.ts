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

import { mergeDefaults } from "@utils/mergeDefaults";
import type { ChannelType, InteractionType, MessageActivity, MessageAttachment, MessageEmbedType,MessageFlags, MessageInteractionMetadata, MessagePoll, MessageRoleSubscriptionData, MessageType, Sticker, StickerItem, UserFlags, UserPremiumType } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { MessageActionCreators, SnowflakeUtils } from "@webpack/common";
import type { LiteralToPrimitive, PartialDeep } from "type-fest";

import type { Argument } from "./types";

const MessageCreator: {
    createBotMessage: (partialMessageRecord: {
        channelId: string;
        content: string;
        embeds?: EmbedJSON[] | null | undefined;
        loggingName?: string | null | undefined;
        messageId?: string | null | undefined;
    }) => MessageJSON;
} = findByPropsLazy("createBotMessage");

export const generateId = () => `-${SnowflakeUtils.fromTimestamp(Date.now())}`;

/**
 * Send a message as Clyde
 * @param channelId ID of the channel to send the message to
 * @param message The message to send
 */
export function sendBotMessage(channelId: string, message: PartialDeep<MessageJSON, { recurseIntoArrays: true; }>) {
    const botMessage = MessageCreator.createBotMessage({ channelId, content: "" });

    MessageActionCreators.receiveMessage(channelId, mergeDefaults(message, botMessage));

    return message as MessageJSON;
}

/**
 * Get the value of an option by name
 * @param args Arguments array (first argument passed to execute)
 * @param name Name of the argument
 * @param fallbackValue Fallback value in case this option wasn't passed
 * @returns Value
 */
export function findOption<T>(args: Argument[], name: string, fallbackValue: T): LiteralToPrimitive<T>;
export function findOption<T>(args: Argument[], name: string): T | undefined;
export function findOption(args: Argument[], name: string, fallbackValue?: unknown) {
    return args.find(a => a.name === name)?.value || fallbackValue;
}

export interface MessageJSON {
    activity?: MessageActivity;
    /** Application object */
    application?: Record<string, any>;
    application_id?: string;
    attachments: MessageAttachment[];
    author: UserJSON;
    call?: {
        ended_timestamp?: string | null;
        participants: string[];
    };
    channel_id: string;
    components?: Record<string, any>[];
    content: string;
    edited_timestamp: string | null;
    embeds: EmbedJSON[];
    flags?: MessageFlags;
    id: string;
    interaction?: {
        id: string;
        /** Guild member object */
        member?: Record<string, any>;
        type: InteractionType;
        user: UserJSON;
    };
    interaction_metadata?: Omit<MessageInteractionMetadata, "user"> & { user: UserJSON; };
    mention_channels?: {
        guild_id: string;
        id: string;
        name: string;
        type: ChannelType;
    }[];
    mention_everyone: boolean;
    mention_roles: string[];
    mentions: UserJSON[];
    message_reference?: {
        channel_id?: string;
        fail_if_not_exists?: boolean;
        guild_id?: string;
        message_id?: string;
    };
    nonce?: string | number;
    pinned: boolean;
    poll?: Omit<MessagePoll, "expiry"> & { expiry: string | null; };
    position?: number;
    reactions?: {
        burst_colors: string[];
        count: number;
        count_details: {
            burst: number;
            normal: number;
        };
        emoji: {
            animated?: boolean;
            id: string | null;
            name: string| null;
        };
        me: boolean;
        me_burst: boolean;
    };
    referenced_message?: MessageJSON | null;
    resolved?: {
        attachments?: { [attachmentId: string]: MessageAttachment; };
        channels?: { [channelId: string]: Record<string, any>; };
        members?: { [userId: string]: Record<string, any>; };
        messages?: { [messageId: string]: Partial<MessageJSON>; };
        roles?: { [roleId: string]: Record<string, any>; };
        users: { [userId: string]: UserJSON; };
    };
    role_subscription_data?: MessageRoleSubscriptionData;
    sticker_items?: StickerItem[];
    stickers?: Sticker;
    /** Channel object */
    thread?: Record<string, any>;
    timestamp: string;
    tts: boolean;
    type: MessageType;
    webhook_id?: string;
}

export interface UserJSON {
    accent_color?: number | null;
    avatar: string | null;
    avatar_decoration_data?: {
        asset: string;
        sku_id: string;
    };
    banner?: string | null;
    bot?: boolean;
    discriminator: string;
    email?: string | null;
    flags?: UserFlags;
    global_name: string | null;
    id: string;
    locale?: string;
    mfa_enabled?: boolean;
    system?: boolean;
    premium_type?: UserPremiumType | 0;
    public_flags?: UserFlags;
    username: string;
    verified?: boolean;
}

export interface EmbedJSON {
    author?: {
        name: string;
        url?: string;
        icon_url?: string;
        proxy_icon_url?: string;
    };
    color?: number;
    description?: string;
    fields?: {
        inline?: boolean
        name: string;
        value: string;
    }[];
    footer?: {
        icon_url?: string;
        proxy_icon_url?: string;
        text: string;
    };
    image?: {
        height?: number;
        proxy_url?: string;
        url: string;
        width?: number;
    };
    provider?: {
        name?: string;
        url?: string;
    };
    thumbnail?: {
        height?: number;
        proxy_url?: string;
        width?: number;
        url: string;
    };
    timestamp?: string;
    title?: string;
    type?: MessageEmbedType;
    url?: string;
    video?: {
        height?: number;
        proxy_url?: string;
        width?: number;
        url?: string;
    };
}
