declare module "@api/Commands" {
    export enum ApplicationCommandInputType {
        BUILT_IN = 0,
        BOT = 1,
        USER = 2,
        UNKNOWN = 3,
        BUILT_IN_TEXT = 4,
        // other values are not important for typing
    }

    export enum ApplicationCommandOptionType {
        SUB_COMMAND = 1,
        SUB_COMMAND_GROUP = 2,
        STRING = 3,
        INTEGER = 4,
        BOOLEAN = 5,
        USER = 6,
        CHANNEL = 7,
        ROLE = 8,
        MENTIONABLE = 9,
        NUMBER = 10,
        ATTACHMENT = 11,
        // keep permissive
    }

    export type CommandOption = {
        name?: string;
        description?: string;
        required?: boolean;
        type?: any;
        options?: CommandOption[];
        displayName?: string;
        displayDescription?: string;
        [k: string]: any;
    };

    export type Command<C = any, O = any> = {
        name?: string;
        description?: string;
        options?: CommandOption[];
        untranslatedName?: string;
        untranslatedDescription?: string;
        id?: string;
        applicationId?: string;
        type?: any;
        inputType?: any;
        plugin?: any;
        execute?: (opts: O, ctx: any) => any;
        [k: string]: any;
    };

    export function findOption<T = any>(opts: any, name: string, def?: T): T;
    export function sendBotMessage(channelId: string, msg: { content?: string; [k: string]: any }): any;

    export const ApplicationCommandInputType: typeof ApplicationCommandInputType;
    export const ApplicationCommandOptionType: typeof ApplicationCommandOptionType;

    const _default: unknown;
    export default _default;
}
declare module "@api/Commands" {
    export const registerCommand: any;
    export const unregisterCommand: any;
    export const findOption: any;
    export const generateId: any;
    export const sendBotMessage: any;
    export const OptionalMessageOption: any;
    export const ApplicationCommandInputType: any;
    export const ApplicationCommandOptionType: any;
    export const Argument: any;
    export type Argument = any;
}
declare module "@api/Commands" {
    export enum ApplicationCommandInputType { BUILT_IN }
    export enum ApplicationCommandOptionType { BOOLEAN, INTEGER }
    export type CommandContext = any;
    export function findOption(opts: any, name: string, fallback?: any): any;
    export function sendBotMessage(channelId: string, msg: any): any;
    export {};
}
