import { filters, waitFor } from "../../webpack";
import type { PartialDeep } from "type-fest";
import { Message } from "discord-types/general";
import { lazyWebpack, mergeDefaults } from "../../utils/misc";
import { Argument } from "./types";

const createBotMessage = lazyWebpack(filters.byCode('username:"Clyde"'));
const MessageSender = lazyWebpack(filters.byProps(["receiveMessage"]));

let SnowflakeUtils: any;
waitFor("fromTimestamp", m => SnowflakeUtils = m);

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

    MessageSender.receiveMessage(channelId, mergeDefaults(message, botMessage));

    return message as Message;
}

/**
 * Get the value of an option by name
 * @param args Arguments array (first argument passed to execute)
 * @param name Name of the argument
 * @param fallbackValue Fallback value in case this option wasn't passed
 * @returns Value
 */
export function findOption<T>(args: Argument[], name: string): T & {} | undefined;
export function findOption<T>(args: Argument[], name: string, fallbackValue: T): T & {};
export function findOption(args: Argument[], name: string, fallbackValue?: any) {
    return (args.find(a => a.name === name)?.value || fallbackValue) as any;
}
