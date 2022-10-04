export interface CommandContext {
    channel: Channel;
    guild: Guild;
}

export interface Guild {
    id: string;
    name: string;
    description: null;
    ownerId: string;
    icon: string;
    splash: null;
    banner: null;
    features: string[];
    preferredLocale: string;
    roles: { [key: string]: Role };
    afkChannelId: null;
    afkTimeout: number;
    systemChannelId: string;
    verificationLevel: number;
    joinedAt: Date;
    defaultMessageNotifications: number;
    mfaLevel: number;
    application_id: null;
    explicitContentFilter: number;
    vanityURLCode: null;
    premiumTier: number;
    premiumSubscriberCount: number;
    premiumProgressBarEnabled: boolean;
    systemChannelFlags: number;
    discoverySplash: null;
    rulesChannelId: null;
    publicUpdatesChannelId: null;
    maxStageVideoChannelUsers: number;
    maxVideoChannelUsers: number;
    maxMembers: number;
    nsfwLevel: number;
    applicationCommandCounts: { [key: string]: number };
    hubType: null;
}

export interface Role {
    id: string;
    name: string;
    permissions: string;
    mentionable: boolean;
    position: number;
    originalPosition: number;
    color: number;
    colorString: null | string;
    hoist: boolean;
    managed: boolean;
    tags: Tags;
    icon: null;
    unicodeEmoji: null;
    flags: string;
}

export interface Tags {
    bot_id?: string;
    premium_subscriber?: null;
}

export interface Channel {
    id: string;
    name: string;
    topic: string;
    position: number;
    recipients: string[];
    rawRecipients: RawRecipient[];
    type: number;
    guild_id: null;
    bitrate: number;
    flags: number;
    permissionOverwrites: Nicks;
    userLimit: number;
    nicks: Nicks;
    nsfw: boolean;
    rateLimitPerUser: number;
    defaultThreadRateLimitPerUser: number;
    lastMessageId: string;
    lastPinTimestamp: Date;
    availableTags: any[];
    appliedTags: any[];
}

export interface Nicks { }

export interface RawRecipient {
    avatar: string;
    avatar_decoration: null;
    bot: boolean;
    discriminator: string;
    id: string;
    public_flags: number;
    username: string;
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
    required: boolean;
    options: Option[] | void;
}

export enum ApplicationCommandType {
    CHAT_INPUT = 1,
    USER = 2,
    MESSAGE = 3,
}

export type CommandReturnValue = {
    content: string;
};

export type Parameter = {
    type: number;
    name: string;
    value: string;
    focused: undefined;
};

export interface Command {
    name: string;
    displayName?: string;
    type: ApplicationCommandType;
    inputType: ApplicationCommandInputType;
    description: string;
    displayDescription?: string;
    options?: Option[];
    execute: (
        parameters: Parameter[],
        msgContext: CommandContext
    ) => CommandReturnValue | void;
}
