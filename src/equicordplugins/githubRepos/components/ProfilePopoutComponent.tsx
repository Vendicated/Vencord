/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";
import { Span } from "@components/Span";
import { fetchReposByUserId, fetchReposByUsername, fetchUserInfo, GitHubUserInfo } from "@equicordplugins/githubRepos/githubApi";
import { GitHubRepo } from "@equicordplugins/githubRepos/types";
import { classes } from "@utils/misc";
import { openModal } from "@utils/modal";
import { findCssClassesLazy } from "@webpack";
import { Clickable, React, useEffect, UserProfileStore, useState } from "@webpack/common";

import { ReposModal } from "./ReposModal";

const DMSideBarClasses = findCssClassesLazy("widgetPreviews");
const ProfileCardClasses = findCssClassesLazy("cardsList", "firstCardContainer", "card", "container");
const ProfileCardContainerClasses = findCssClassesLazy("innerContainer", "icons", "icon", "displayCount", "displayCountText", "displayCountTextColor", "breadcrumb");
const ProfileCardOverlayClasses = findCssClassesLazy("overlay", "isPrivate", "outer");

const LANGUAGE_MAP: Record<string, string> = {
    "c++": "cplusplus",
    "c#": "csharp",
    "f#": "fsharp",
    "q#": "qsharp",
    "objective-c": "objectivec",
    "visual basic": "visualbasic",
    "shell": "bash",
    "batchfile": "bash",
    "vim script": "vim",
    "dockerfile": "docker",
    "gdscript": "godot",
    "html": "html5",
};

function getLanguageIconUrl(language: string | null): string {
    if (!language) return "https://cdn.jsdelivr.net/gh/devicons/devicon@develop/icons/github/github-original.svg";

    const normalized = LANGUAGE_MAP[language.toLowerCase()] ?? language.toLowerCase().replace(/\s+/g, "");
    return `https://cdn.jsdelivr.net/gh/devicons/devicon@develop/icons/${normalized}/${normalized}-original.svg`;
}

export function ProfilePopoutComponent({ id, isSideBar = false }: { id: string, isSideBar?: boolean; }) {
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<GitHubUserInfo | null>(null);

    const openReposModal = () => {
        if (!userInfo) return;
        const sortedRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
        openModal(props => (
            <ReposModal repos={sortedRepos} username={userInfo.username} rootProps={props} />
        ));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profile = UserProfileStore.getUserProfile(id);
                if (!profile) { setLoading(false); return; }

                const connections = profile.connectedAccounts;
                if (!connections?.length) { setLoading(false); return; }

                const githubConnection = connections.find(conn => conn.type === "github");
                if (!githubConnection) { setLoading(false); return; }

                const username = githubConnection.name;
                const userInfoData = await fetchUserInfo(username);
                if (userInfoData) setUserInfo(userInfoData);

                const githubId = githubConnection.id;

                const reposById = await fetchReposByUserId(githubId);
                if (reposById) { setRepos(reposById); setLoading(false); return; }

                const reposByUsername = await fetchReposByUsername(username);
                setRepos(reposByUsername);
                setLoading(false);
            } catch (error) {
                setError(error instanceof Error ? error.message : "Failed to fetch repositories");
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading || error || !repos.length) return null;

    const topRepos = repos.slice(0, 4);

    const reposSection = (
        <section className={ProfileCardClasses.container}>
            <ul className={ProfileCardClasses.cardsList} tabIndex={-1}>
                <li className={ProfileCardClasses.firstCardContainer}>
                    <Clickable className={ProfileCardContainerClasses.breadcrumb} onClick={openReposModal}>
                        <div className={classes(ProfileCardOverlayClasses.overlay, ProfileCardContainerClasses.innerContainer, ProfileCardClasses.card)}>
                            <Paragraph size={isSideBar ? "sm" : "xs"} weight="medium">
                                GitHub Repositories
                            </Paragraph>
                            {!!repos.length && (
                                <div className={ProfileCardContainerClasses.icons}>
                                    {topRepos.slice(0, 4).map((repo, idx) => {
                                        const showCount = idx === 3 && repos.length > 4;

                                        return (
                                            <div className={ProfileCardContainerClasses.icon} key={repo.id}>
                                                <img
                                                    src={getLanguageIconUrl(repo.language)}
                                                    alt={repo.language ?? "Unknown"}
                                                    className={showCount ? ProfileCardContainerClasses.displayCount : undefined}
                                                />
                                                {showCount && (
                                                    <div className={ProfileCardContainerClasses.displayCountText}>
                                                        <Span className={ProfileCardContainerClasses.displayCountTextColor} size={isSideBar ? "sm" : "xs"} weight="medium">
                                                            +{repos.length - 4}
                                                        </Span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Clickable>
                </li>
            </ul>
        </section>
    );

    return isSideBar
        ? <div className={DMSideBarClasses.widgetPreviews}>{reposSection}</div>
        : reposSection;
}
