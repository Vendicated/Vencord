/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { React } from "@webpack/common";

import { getLanguageColor } from "../colors";
import { RepoCardProps } from "../types";
import { Star } from "./Star";

export function RepoCard({ repo, theme, showStars, showLanguage }: RepoCardProps) {
    const handleClick = () => window.open(repo.html_url, "_blank");

    const renderStars = () => {
        if (!showStars) return null;

        return (
            <div className="vc-github-repo-stars">
                <Star className="vc-github-repo-star-icon" />
                {repo.stargazers_count.toLocaleString()}
            </div>
        );
    };

    const renderLanguage = () => {
        if (!showLanguage || !repo.language) return null;

        return (
            <div className="vc-github-repo-language">
                <span
                    className="vc-github-repo-language-color"
                    style={{ backgroundColor: getLanguageColor(repo.language) }}
                />
                {repo.language}
            </div>
        );
    };

    return (
        <div className="vc-github-repo-card" onClick={handleClick}>
            <Flex className="vc-github-repo-header">
                <div className="vc-github-repo-name">{repo.name}</div>
                {renderStars()}
            </Flex>

            {repo.description && (
                <div className="vc-github-repo-description">
                    {repo.description}
                </div>
            )}

            {renderLanguage()}
        </div>
    );
}
