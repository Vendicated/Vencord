import { RoleFlags } from "../../enums";

export interface Role {
    color: number;
    colorString: string | undefined;
    colorStrings: {
        primaryColor: string | undefined;
        secondaryColor: string | undefined;
        tertiaryColor: string | undefined;
    };
    colors: {
        primary_color: number | undefined;
        secondary_color: number | undefined;
        tertiary_color: number | undefined;
    };
    description: string | null;
    flags: RoleFlags;
    guildId: string;
    hoist: boolean;
    icon: string | null;
    id: string;
    managed: boolean;
    mentionable: boolean;
    name: string;
    permissions: bigint;
    position: number;
    tags: {
        bot_id?: string;
        integration_id?: string;
        premium_subscriber?: null;
        subscription_listing_id?: string;
        available_for_purchase?: null;
        guild_connections?: null;
    } | undefined;
    unicodeEmoji: string | null;
    version: number | undefined;
}
