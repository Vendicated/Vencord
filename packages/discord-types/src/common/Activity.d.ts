import { CSSProperties, ImgHTMLAttributes, JSX } from "react";
import { Application } from "./Application";
import { User } from "./User";

export interface ActivityTimestamp {
    start?: number;
    end?: number;
}

export interface Developer {
    id: string;
    name: string;
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

export interface ActivityViewProps {
    activity: Activity | null;
    user: User;
    application?: Application;
    currentUser: User;
}

export interface ApplicationIcon {
    image: ImgHTMLAttributes<HTMLImageElement> & {
        src: string;
        alt: string;
    };
    activity: Activity;
    application?: Application;
}

export interface Executable {
    os: string;
    name: string;
    is_launcher: boolean;
}

export interface ActivityListIcon {
    iconElement: JSX.Element;
    tooltip?: JSX.Element | string;
}

export interface IconCSSProperties extends CSSProperties {
    "--icon-size": string;
}

export interface ActivityListProps {
    activities: Activity[];
    user: User;
    hideTooltip: boolean;
}

export interface ActivityTooltipProps {
    activity: Activity;
    application?: Application;
    user: User;
}

export interface AllActivitiesProps {
    activity: Activity;
    user: User;
    application: Application;
    type: string;
    [key: string]: any;
}

export interface CarouselControlsProps {
    activities: Activity[];
    currentActivity: Activity;
    onActivityChange: (activity: Activity) => void;
}

export interface ActivityViewProps {
    activity: Activity | null;
    user: User;
    application?: Application;
    currentUser: User;
}

export const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}
