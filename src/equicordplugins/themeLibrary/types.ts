/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalProps } from "@utils/modal";
import { User } from "discord-types/general";

type Author = {
    github_name?: string;
    discord_name: string;
    discord_snowflake: string;
};

export interface Theme {
    id: string;
    name: string;
    content: string;
    type: string | "theme" | "snippet";
    description: string;
    version: string;
    author: Author | Author[];
    likes: number;
    tags: string[];
    thumbnail_url: string;
    release_date: Date;
    last_updated?: Date;
    guild?: {
        name: string;
        snowflake: string;
        invite_link: string;
    };
    source?: string;
    requiresThemeAttributes?: boolean;
}

export interface ThemeInfoModalProps extends ModalProps {
    author: User | User[];
    theme: Theme;
}

export const enum TabItem {
    THEMES,
    SUBMIT_THEMES,
}

export interface LikesComponentProps {
    theme: Theme;
    userId: User["id"];
}

export const enum SearchStatus {
    ALL,
    ENABLED,
    DISABLED,
    THEME,
    SNIPPET,
    DARK,
    LIGHT,
    LIKED,
}

export type ThemeLikeProps = {
    status: number;
    likes: [{
        themeId: number;
        likes: number;
        hasLiked?: boolean;
    }];
};

export interface Contributor {
    username: User["username"];
    github_username: string;
    id: User["id"];
    avatar: string;
}
