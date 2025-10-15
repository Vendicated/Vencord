declare module "discord-types/general" {
    export interface User {
        id: string;
        username: string;
        avatar?: string;
        // Accept multiple signatures used in the repo
        getAvatarURL?: {
            (size?: number | undefined): string;
            (guildId?: string | null | undefined, size?: number | undefined, forceStatic?: boolean | undefined): string;
        } | ((...args: any[]) => string);
    }
    export interface Guild { id: string }
    export interface Message { id: string; content: string }
    export interface GuildMember { user: User }
}

declare module "discord-types/channels" {
    export interface Channel { id: string }
}
