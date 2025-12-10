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
    flags: number;
    hoist: boolean;
    icon: string | undefined;
    id: string;
    managed: boolean;
    mentionable: boolean;
    name: string;
    originalPosition: number;
    permissions: bigint;
    position: number;
    /**
     * probably incomplete
     */
    tags: {
        bot_id: string;
        integration_id: string;
        premium_subscriber: unknown;
    } | undefined;
    unicodeEmoji: string | undefined;
}
