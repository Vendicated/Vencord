import { ActivityFlags, ActivityStatusDisplayType, ActivityType } from "../../enums";

export type ActivityPlatform = "desktop" | "mobile" | "web" | "embedded" | "xbox" | "playstation" | "samsung" | "ios" | "android";

export interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    large_url?: string;
    small_image?: string;
    small_text?: string;
    small_url?: string;
}

export interface ActivityButton {
    label: string;
    url: string;
}

export interface Activity {
    created_at?: number;
    id?: string;
    name: string;
    application_id?: string;
    type: ActivityType;
    session_id?: string;
    sync_id?: string;
    emoji?: {
        animated: boolean;
        id: string;
        name: string;
    };
    state?: string;
    state_url?: string;
    details?: string;
    details_url?: string;
    url?: string;
    flags: ActivityFlags;
    status_display_type?: ActivityStatusDisplayType;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: string[];
    metadata?: {
        button_urls?: Array<string>;
    };
    platform?: ActivityPlatform;
    party?: {
        id?: string;
        size?: [number, number];
    };
}

export type OnlineStatus = "online" | "idle" | "dnd" | "invisible" | "offline" | "unknown" | "streaming";
