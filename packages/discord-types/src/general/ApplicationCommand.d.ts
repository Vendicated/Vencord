/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ApplicationIntegrationType } from "./ApplicationRecord";
import type { ChannelType } from "./channels/ChannelRecord";

export type ApplicationCommand<CommandType extends ApplicationCommandType = ApplicationCommandType> = {
    application_id: string;
    contexts?: InteractionContextType[] | null;
    /** Permissions serialized as a string. */
    default_member_permissions: string | null;
    default_permission?: boolean | null;
    description: CommandType extends ApplicationCommandType.CHAT ? string : "";
    description_localizations?: { [locale: string]: string; } | null;
    dm_permission?: boolean;
    guild_id?: string;
    id: string;
    integration_types?: ApplicationIntegrationType[];
    name: string;
    name_localizations?: { [locale: string]: string; } | null;
    nsfw?: boolean;
    type?: ApplicationCommandType;
    version: string;
} & (CommandType extends ApplicationCommandType.CHAT ? { options?: ApplicationCommandOption[]; } : {});

export const enum InteractionContextType {
    GUILD = 0,
    BOT_DM = 1,
    PRIVATE_CHANNEL = 2,
}

export const enum ApplicationCommandType {
    CHAT = 1,
    USER = 2,
    MESSAGE = 3,
    PRIMARY_ENTRY_POINT = 4,
}

export type ApplicationCommandOption = ApplicationCommandSubcommandOption | ApplicationCommandSubcommandGroupOption | ApplicationCommandNonSubOption;

export interface ApplicationCommandOptionBase extends Pick<ApplicationCommand, "description" | "description_localizations" | "name" | "name_localizations"> {
    type: ApplicationCommandOptionType;
}

export interface ApplicationCommandSubcommandOption extends ApplicationCommandOptionBase {
    options?: ApplicationCommandNonSubOption[];
    type: ApplicationCommandOptionType.SUB_COMMAND;
}

export interface ApplicationCommandSubcommandGroupOption extends ApplicationCommandOptionBase {
    options?: ApplicationCommandOption[];
    type: ApplicationCommandOptionType.SUB_COMMAND;
}

export type ApplicationCommandNonSubOption = ApplicationCommandChoicesOption | ApplicationCommandBooleanOption | ApplicationCommandUserOption | ApplicationCommandChannelOption | ApplicationCommandRoleOption | ApplicationCommandMentionableOption | ApplicationCommandAttachmentOption;

export interface ApplicationCommandNonSubOptionBase extends ApplicationCommandOptionBase {
    required?: boolean;
}

type ApplicationCommandChoiceOptionType = ApplicationCommandOptionType.STRING | ApplicationCommandOptionType.INTEGER | ApplicationCommandOptionType.NUMBER;

export type ApplicationCommandChoicesOption = ApplicationCommandStringOption | ApplicationCommandNumericOption;

export type ApplicationCommandChoicesOptionBase = ApplicationCommandNonSubOptionBase
    & { type: ApplicationCommandChoiceOptionType; }
    & ({ autocomplete?: false; choice: ApplicationCommandOptionChoice[]; }
    | { autocomplete?: boolean; });

export interface ApplicationCommandOptionChoice<
    OptionType extends ApplicationCommandChoiceOptionType = ApplicationCommandChoiceOptionType
> extends Pick<ApplicationCommand, "name" | "name_localizations"> {
    value: OptionType extends ApplicationCommandOptionType.STRING ? string
        : OptionType extends ApplicationCommandOptionType.INTEGER | ApplicationCommandOptionType.NUMBER ? number
            : never;
}

export type ApplicationCommandStringOption = ApplicationCommandChoicesOptionBase & {
    max_length?: number;
    min_length?: number;
    type: ApplicationCommandOptionType.STRING;
};

export type ApplicationCommandNumericOption = ApplicationCommandIntegerOption | ApplicationCommandNumberOption;

export type ApplicationCommandNumericOptionBase = ApplicationCommandChoicesOptionBase & {
    max_value?: number;
    min_value?: number;
    type: ApplicationCommandOptionType.INTEGER | ApplicationCommandOptionType.NUMBER;
};

export type ApplicationCommandIntegerOption = ApplicationCommandNumericOptionBase & {
    type: ApplicationCommandOptionType.INTEGER;
};

export type ApplicationCommandNumberOption = ApplicationCommandNumericOptionBase & {
    type: ApplicationCommandOptionType.NUMBER;
};

export interface ApplicationCommandBooleanOption extends ApplicationCommandNonSubOptionBase {
    type: ApplicationCommandOptionType.BOOLEAN;
}

export interface ApplicationCommandUserOption extends ApplicationCommandNonSubOptionBase {
    type: ApplicationCommandOptionType.USER;
}

export interface ApplicationCommandChannelOption extends ApplicationCommandNonSubOptionBase {
    channel_types?: ChannelType[];
    type: ApplicationCommandOptionType.CHANNEL;
}

export interface ApplicationCommandRoleOption extends ApplicationCommandNonSubOptionBase {
    type: ApplicationCommandOptionType.ROLE;
}

export interface ApplicationCommandMentionableOption extends ApplicationCommandNonSubOptionBase {
    type: ApplicationCommandOptionType.MENTIONABLE;
}

export interface ApplicationCommandAttachmentOption extends ApplicationCommandNonSubOptionBase {
    type: ApplicationCommandOptionType.ATTACHMENT;
}

export const enum ApplicationCommandOptionType {
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
