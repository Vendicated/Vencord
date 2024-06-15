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
import type { MessageAttachment, StickerItem, UserFlags, UserPremiumType } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { MessageActionCreators, SnowflakeUtils } from "@webpack/common";
// eslint-disable-next-line no-restricted-imports
import type { EmbedJSON as $EmbedJSON, MessageJSON as $MessageJSON } from "discord-types/general";
import type { LiteralToPrimitive, PartialDeep } from "type-fest";

import type { Argument } from "./types";

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

export interface EmbedJSON extends Omit<$EmbedJSON, "color"> {
    color?: number;
    fields?: {
        inline?: boolean
        name: string;
        value: string;
    }[];
    image?: {
        height?: number;
        proxy_url?: string;
        url: string;
        width?: number;
    }
    footer?: {
        icon_url?: string;
        proxy_icon_url?: string;
        text: string;
    };
    timestamp?: string;
}

export interface MessageJSON extends Omit<$MessageJSON, "author" | "attachments" | "embeds"> {
    author: UserJSON;
    attachments: MessageAttachment[];
    embeds: EmbedJSON[];
    sticker_items?: StickerItem[];
}

const MessageCreator: {
    createBotMessage: (partialMessageRecord: {
        channelId: string;
        content: string;
        embeds?: EmbedJSON[] | null | undefined;
        loggingName?: string | null | undefined;
        messageId?: string | null | undefined;
    }) => MessageJSON;
} = findByPropsLazy("createBotMessage");

export function generateId() {
    return `-${SnowflakeUtils.fromTimestamp(Date.now())}`;
}

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
