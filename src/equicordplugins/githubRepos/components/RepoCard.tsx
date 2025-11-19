/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { getLanguageColor } from "@equicordplugins/githubRepos/colors";
import { RepoCardProps } from "@equicordplugins/githubRepos/types";
import { React, Tooltip } from "@webpack/common";

import { cl } from "..";
import { Star } from "./Star";

export function RepoCard({ repo, showStars, showLanguage }: RepoCardProps) {
    const handleClick = () => window.open(repo.html_url, "_blank");

    const renderStars = () => {
        if (!showStars) return null;

        return (
            <div className={cl("stars")}>
                <Star className={cl("stars-icon")} />
                <BaseText size="sm">{repo.stargazers_count.toLocaleString()}</BaseText>
            </div>
        );
    };

    const renderLink = () => {
        return (
            <div onClick={handleClick}>
                <svg
                    className={cl("link")}
                    aria-hidden="true"
                    role="img"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <path
                        d="M8 5a1 1 0 0 0 0 2h7.59L5.29 17.3a1 1 0 1 0 1.42 1.4L17 8.42V16a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1H8Z"
                    />
                </svg>
            </div>
        );
    };

    const renderLanguage = () => {
        if (!showLanguage || !repo.language) return null;

        return (
            <div className={cl("language")}>
                <span
                    className={cl("language-color")}
                    style={{ backgroundColor: getLanguageColor(repo.language) }}
                />
                <BaseText size="sm">{repo.language}</BaseText>
                {renderStars()}
            </div >
        );
    };

    return (
        <>
            {repo.description ? (
                <Tooltip text={repo.description} key={repo.id}>
                    {({ onMouseLeave, onMouseEnter }) => (
                        <div className={cl("card")}
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                        >
                            <div className={cl("header")}>
                                <BaseText size="sm" weight="medium" className={cl("name")}>
                                    {repo.name}
                                </BaseText>
                                {renderLink()}
                            </div>
                            {renderLanguage()}
                        </div>
                    )}
                </Tooltip>
            ) : (
                <div className={cl("card")}>
                    <div className={cl("header")}>
                        <BaseText size="sm" weight="medium" className={cl("name")} >
                            {repo.name}
                        </BaseText>
                        {renderLink()}
                    </div>
                    {renderLanguage()}
                </div>
            )}
        </>
    );
}
