export interface Role {
    color: number;
    colorString: string | undefined;
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
