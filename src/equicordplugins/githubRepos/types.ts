/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface GitHubRepo {
    id: number;
    name: string;
    html_url: string;
    description: string;
    stargazers_count: number;
    language: string;
    fork: boolean;
}

export interface IconProps {
    className?: string;
    width?: number;
    height?: number;
}

export interface RepoCardProps {
    repo: GitHubRepo;
    showStars: boolean;
    showLanguage: boolean;
}
