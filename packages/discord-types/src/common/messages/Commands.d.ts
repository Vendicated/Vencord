import { Channel } from "../Channel";
import { Guild } from "../Guild";
import { Promisable } from "type-fest";
import { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType } from "../../../enums";

export interface CommandContext {
    channel: Channel;
    guild?: Guild;
}

export interface CommandOption {
    name: string;
    displayName?: string;
    type: ApplicationCommandOptionType;
    description: string;
    displayDescription?: string;
    required?: boolean;
    options?: CommandOption[];
    choices?: Array<ChoicesOption>;
}

export interface ChoicesOption {
    label: string;
    value: string;
    name: string;
    displayName?: string;
}

export interface CommandReturnValue {
    content: string;
    // TODO: implement
    // cancel?: boolean;
}

export interface CommandArgument {
    type: ApplicationCommandOptionType;
    name: string;
    value: string;
    focused: undefined;
    options: CommandArgument[];
}

export interface Command {
    id?: string;
    applicationId?: string;
    type?: ApplicationCommandType;
    inputType?: ApplicationCommandInputType;
    plugin?: string;

    name: string;
    untranslatedName?: string;
    displayName?: string;
    description: string;
    untranslatedDescription?: string;
    displayDescription?: string;

    options?: CommandOption[];
    predicate?(ctx: CommandContext): boolean;

    execute(args: CommandArgument[], ctx: CommandContext): Promisable<void | CommandReturnValue>;
}
