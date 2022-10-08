import { Channel, Guild } from "discord-types/general";
import { waitFor, findByProps } from "../webpack";

export function _init(cmds: Command[]) {
    try {
        BUILT_IN = cmds;
        OptionalMessageOption = cmds.find(c => c.name === "shrug")!.options![0];
        RequiredMessageOption = cmds.find(c => c.name === "me")!.options![0];
    } catch (e) {
        console.error("Failed to load CommandsApi");
    }
    return cmds;
}

export let BUILT_IN: Command[];
export const commands = {} as Record<string, Command>;

// hack for plugins being evaluated before we can grab these from webpack
const OptPlaceholder = Symbol("OptionalMessageOption") as any as Option;
const ReqPlaceholder = Symbol("RequiredMessageOption") as any as Option;
/**
 * Optional message option named "message" you can use in commands.
 * Used in "tableflip" or "shrug"
 * @see {@link RequiredMessageOption}
 */
export let OptionalMessageOption: Option = OptPlaceholder;
/**
 * Required message option named "message" you can use in commands.
 * Used in "me"
 * @see {@link OptionalMessageOption}
 */
export let RequiredMessageOption: Option = ReqPlaceholder;

let SnowflakeUtils: any;
waitFor("fromTimestamp", m => SnowflakeUtils = m);

export function generateId() {
    return `-${SnowflakeUtils.fromTimestamp(Date.now())}`;
}

/**
 * Get the value of an option by name
 * @param args Arguments array (first argument passed to execute)
 * @param name Name of the argument
 * @param fallbackValue Fallback value in case this option wasn't passed
 * @returns Value
 */
export function findOption<T extends string | undefined>(args: Argument[], name: string, fallbackValue?: T): T extends undefined ? T : string {
    return (args.find(a => a.name === name)?.value || fallbackValue) as any;
}

function modifyOpt(opt: Option | Command) {
    opt.displayName ||= opt.name;
    opt.displayDescription ||= opt.description;
    opt.options?.forEach((opt, i, opts) => {
        // See comment above Placeholders
        if (opt === OptPlaceholder) opts[i] = OptionalMessageOption;
        else if (opt === ReqPlaceholder) opts[i] = RequiredMessageOption;
        modifyOpt(opts[i]);
    });
}

export function registerCommand(command: Command, plugin: string) {
    if (BUILT_IN.some(c => c.name === command.name))
        throw new Error(`Command '${command.name}' already exists.`);

    command.id ||= generateId();
    command.applicationId ||= "-1"; // BUILT_IN;
    command.type ||= ApplicationCommandType.CHAT_INPUT;
    command.inputType ||= ApplicationCommandInputType.BUILT_IN_TEXT;
    command.plugin ||= plugin;

    modifyOpt(command);
    commands[command.name] = command;
    BUILT_IN.push(command);
}

/**
 * Send a message as Clyde
 * @param channelId ID of channel to send message to
 * @param message Message to send
 * @param embed Array of embeds to send (can be blank)
 * @param loggingName Frankly no fucking clue what this does, if not set will be replaced with "Cumbot"
 * @returns null
 */
export function sendBotMessage(channelId, message, embed, loggingName) {
    const clyde = findByProps("sendBotMessage");

    clyde.sendBotMessage(channelId, message, (embed || []), (loggingName || "Cumbot"));
}

export function unregisterCommand(name: string) {
    const idx = BUILT_IN.findIndex(c => c.name === name);
    if (idx === -1)
        return false;

    BUILT_IN.splice(idx, 1);
    delete commands[name];
}

export interface CommandContext {
    channel: Channel;
    guild?: Guild;
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
}

export enum ApplicationCommandInputType {
    BUILT_IN = 0,
    BUILT_IN_TEXT = 1,
    BUILT_IN_INTEGRATION = 2,
    BOT = 3,
    PLACEHOLDER = 4,
}

export interface Option {
    name: string;
    displayName?: string;
    type: ApplicationCommandOptionType;
    description: string;
    displayDescription?: string;
    required?: boolean;
    options?: Option[];
}

export enum ApplicationCommandType {
    CHAT_INPUT = 1,
    USER = 2,
    MESSAGE = 3,
}

export interface CommandReturnValue {
    content: string;
}

export interface Argument {
    type: ApplicationCommandOptionType;
    name: string;
    value: string;
    focused: undefined;
}

export interface Command {
    id?: string;
    applicationId?: string;
    type?: ApplicationCommandType;
    inputType?: ApplicationCommandInputType;
    plugin?: string;

    name: string;
    displayName?: string;
    description: string;
    displayDescription?: string;

    options?: Option[];
    predicate?(ctx: CommandContext): boolean;

    execute(args: Argument[], ctx: CommandContext): CommandReturnValue | void;
}
