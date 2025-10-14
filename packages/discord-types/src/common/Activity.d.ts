import { ActivityFlags, ActivityStatusDisplayType, ActivityType } from "../../enums";

export interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

export interface ActivityButton {
    label: string;
    url: string;
}

export interface Activity {
    created_at?: number;
    id?: string;
    name: string;
    application_id: string;
    type: ActivityType;
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
    platform?: string;
    party?: {
        id?: string;
        size?: [number, number];
    };
}
