/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mergeDefaults } from "@utils/mergeDefaults";
import { CommandArgument, Message } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { MessageActions, SnowflakeUtils } from "@webpack/common";
import type { PartialDeep } from "type-fest";

const createBotMessage = findByCodeLazy('username:"Clyde"');

export function generateId() {
    return `-${SnowflakeUtils.fromTimestamp(Date.now())}`;
}

/**
 * Send a message as Clyde
 * @param {string} channelId ID of channel to send message to
 * @param {Message} message Message to send
 * @returns {Message}
 */
export function sendBotMessage(channelId: string, message: PartialDeep<Message>): Message {
    const botMessage = createBotMessage({ channelId, content: "", embeds: [] });

    MessageActions.receiveMessage(channelId, mergeDefaults(message, botMessage));

    return message as Message;
}

/**
 * Get the value of an option by name
 * @param args Arguments array (first argument passed to execute)
 * @param name Name of the argument
 * @param fallbackValue Fallback value in case this option wasn't passed
 * @returns Value
 */
export function findOption<T>(args: CommandArgument[], name: string): T & {} | undefined;
export function findOption<T>(args: CommandArgument[], name: string, fallbackValue: T): T & {};
export function findOption(args: CommandArgument[], name: string, fallbackValue?: any) {
    return (args.find(a => a.name === name)?.value ?? fallbackValue) as any;
}
