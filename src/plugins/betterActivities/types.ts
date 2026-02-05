/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { User } from "discord-types/general";
import { CSSProperties, ImgHTMLAttributes, JSX } from "react";

export interface Timestamp {
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
    timestamps?: Timestamp;
    platform?: string;
}

export interface Application {
    id: string;
    name: string;
    icon: string;
    description: string;
    summary: string;
    type: number;
    hook: boolean;
    guild_id: string;
    executables: Executable[];
    verify_key: string;
    publishers: Developer[];
    developers: Developer[];
    flags: number;
}

export interface Developer {
    id: string;
    name: string;
}

export interface Executable {
    os: string;
    name: string;
    is_launcher: boolean;
}

export interface ApplicationIcon {
    image: ImgHTMLAttributes<HTMLImageElement> & {
        src: string;
        alt: string;
    };
    activity: Activity;
    application?: Application;
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
