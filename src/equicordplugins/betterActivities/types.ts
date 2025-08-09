/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Activity, Application, User } from "@vencord/discord-types";
import { CSSProperties, ImgHTMLAttributes, JSX } from "react";

export type { Application, User } from "@vencord/discord-types";

export interface Developer {
    id: string;
    name: string;
}

export interface ActivityViewProps {
    activity: Activity | null;
    user: User;
    application?: Application;
    currentUser: User;
}

export interface ApplicationIcon {
    image?: ImgHTMLAttributes<HTMLImageElement> & {
        src: string;
        alt: string;
    };
    element?: JSX.Element;
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
