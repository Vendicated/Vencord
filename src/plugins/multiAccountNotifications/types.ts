export type AckEvent = {
    channel_id: string;
    message_id: string;
};

export type ReadyEvent = {
    read_state: {
        id: string;
        mention_count: number;
        last_message_id: string;
    }[];
    user_guild_settings: GuildSettings[];
    user: {
        id: string;
    };
    guilds: {
        id: string;
        channels: { id: string; }[];
        members: {
            user: { id: string; };
            roles: string[];
        }[];
    }[];
    notification_settings: {
        flags: number;
    };
};

export type CreateEvent = {
    mention_everyone: boolean;
    mention_roles: string[];
    mentions: { id: string; }[];
    channel_id: string;
    id: string;
    guild_id?: string;
    author: { id: string; };
};

export type GuildSettings = {
    /**
     * When the guild is null, it's referencing DMs.
     */
    guild_id: string | null;
    channel_overrides: {
        muted: boolean;
        channel_id: string;
        flags: number;
    }[];
    flags: number;
    suppress_everyone: boolean;
    suppress_roles: boolean;
    muted: boolean;
};

export type Status = "clear" | "badge" | "ping";

export type Update = "USER_GUILD_SETTINGS_UPDATE" | "GUILD_DELETE" | "CHANNEL_DELETE" | "GUILD_MEMBER_UPDATE";
export type UpdateEvent = {
    event: Update;
    data: unknown;
};
