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
        channels: { id: string; }[];
        members: {
            user: { id: string; };
            roles: string[];
        }[];
    }[];
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
    }[];
    suppress_everyone: boolean;
    suppress_roles: boolean;
    muted: boolean;
};

export type Status = "clear" | "badge" | "ping";
