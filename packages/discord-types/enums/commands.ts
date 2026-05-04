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

export const enum ApplicationCommandInputType {
    BUILT_IN = 0,
    BUILT_IN_TEXT = 1,
    BUILT_IN_INTEGRATION = 2,
    BOT = 3,
    PLACEHOLDER = 4,
}

export const enum ApplicationCommandType {
    /**
     * @remarks Discord API calls this just CHAT
     */
    CHAT_INPUT = 1,
    USER = 2,
    MESSAGE = 3,
    PRIMARY_ENTRY_POINT = 4,
}

export const enum ApplicationIntegrationType {
    GUILD_INSTALL = 0,
    USER_INSTALL = 1,
}

export const enum InteractionType {
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3,
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    MODAL_SUBMIT = 5,
}

export const enum ApplicationCommandSectionType {
    BUILT_IN = 0,
    APPLICATION = 1,
}

export const enum ApplicationCommandPermissionType {
    ROLE = 1,
    USER = 2,
    CHANNEL = 3,
}

export const enum InteractionContextType {
    GUILD = 0,
    BOT_DM = 1,
    PRIVATE_CHANNEL = 2,
}

export const enum ApplicationCommandHandlerType {
    APP_HANDLER = 1,
    DISCORD_LAUNCH_ACTIVITY = 2,
}
