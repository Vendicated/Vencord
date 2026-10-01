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
    description: string | undefined;
    flags: RoleFlags;
    guildId: string;
    hoist: boolean;
    icon: string | undefined;
    id: string;
    managed: boolean;
    mentionable: boolean;
    name: string;
    permissions: bigint;
    position: number;
    tags: {
        bot_id?: string;
        integration_id?: string;
        premium_subscriber?: unknown;
        subscription_listing_id?: string;
        available_for_purchase?: unknown;
        guild_connections?: unknown;
    } | undefined;
    unicodeEmoji: string | undefined;
    version: number | undefined;
}
