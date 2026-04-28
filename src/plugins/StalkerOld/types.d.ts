import { Channel, MessageJSON, UserJSON } from "discord-types/general";

export interface MessageUpdatePayload {
    type: string;
    guildId: string;
    message: MessageJSON;
}

export interface MessageCreatePayload {
    type: string;
    guildId: string;
    channelId: string;
    message: MessageJSON;
    optimistic: boolean;
    isPushNotification: boolean;
}

export interface MessageDeletePayload {
    type: string;
    guildId: string;
    id: string;
    channelId: string;
    mlDeleted?: boolean;
}

export interface TypingStartPayload {
    type: string;
    channelId: string;
    userId: string;
}

export interface UserUpdatePayload {
    type: string;
    user: {
        id: string;
        username: string;
        avatar: string;
        discriminator: string;
        flags: number;
        banner: string;
        banner_color: string;
        accent_color: number;
        bio: string;
        publicFlags: number;
        avatarDecorationData: {
            asset: string;
            skuId: string;
        };
        globalName: string | null;
    };
}
interface ThreadCreatePayload {
    type: string;
    isNewlyCreated: boolean;
    channel: Channel;
}

export type subscribedEvents =
    | "MESSAGE_CREATE"
    | "MESSAGE_DELETE"
    | "MESSAGE_UPDATE"
    | "THREAD_CREATE"
    | "TYPING_START"
    | "USER_UPDATE";
