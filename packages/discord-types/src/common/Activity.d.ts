import { CSSProperties, ImgHTMLAttributes, JSX } from "react";
import { Application } from "./Application";
import { User } from "./User";

export interface ActivityTimestamp {
    start?: number;
    end?: number;
}

export interface Activity {
    created_at: number;
    id: string;
    name: string;
    type: number;
    emoji?: {
        animated: boolean;
        id: string;
        name: string;
    };
    state?: string;
    flags?: number;
    sync_id?: string;
    details?: string;
    application_id?: string;
    assets?: {
        large_text?: string;
        large_image?: string;
        small_text?: string;
        small_image?: string;
    };
    buttons?: Array<string>;
    metadata?: {
        button_urls?: Array<string>;
    };
    timestamps?: ActivityTimestamp;
    platform?: string;
}

export const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}
