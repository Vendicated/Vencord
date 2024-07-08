/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Guild, User } from "discord-types/general";
import { CSSProperties, ImgHTMLAttributes } from "react";

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
    }
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

export enum ActivityViewType {
    USER_POPOUT = "UserPopout",
    USER_POPOUT_V2 = "UserPopoutV2",
    ACTIVITY_FEED = "ActivityFeed",
    PROFILE = "Profile",
    PROFILE_V2 = "ProfileV2",
    STREAM_PREVIEW = "StreamPreview",
    VOICE_CHANNEL = "VoiceChannel",
    SIMPLIFIED_PROFILE = "SimplifiedProfile",
    BITE_SIZE_POPOUT = "BiteSizePopout"
}

export interface ActivityViewProps {
    activity: Activity | null;
    user: User;
    activityGuild: Guild;
    type: ActivityViewType;
    showChannelDetails: boolean;
}
