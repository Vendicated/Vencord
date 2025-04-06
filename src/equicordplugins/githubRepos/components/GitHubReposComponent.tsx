/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { openModal } from "@utils/modal";
import { Button, React, Text, useEffect, UserProfileStore, useState } from "@webpack/common";

import { settings } from "..";
import { fetchReposByUserId, fetchReposByUsername, fetchUserInfo, GitHubUserInfo } from "../githubApi";
import { GitHubRepo } from "../types";
import { RepoCard } from "./RepoCard";
import { ReposModal } from "./ReposModal";

export function GitHubReposComponent({ id, theme }: { id: string, theme: string; }) {
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<GitHubUserInfo | null>(null);
    const [returnJustButton, setReturnJustButton] = useState(false);

    const cl = classNameFactory("vc-github-repos-");

    const openReposModal = () => {
        if (!userInfo) return;

        const sortedRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
        openModal(props => (
            <ReposModal
                repos={sortedRepos}
                username={userInfo.username}
                rootProps={props}
            />
        ));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profile = UserProfileStore.getUserProfile(id);
                if (!profile) {
                    setLoading(false);
                    return;
                }

                const connections = profile.connectedAccounts;
                if (!connections?.length) {
                    setLoading(false);
                    return;
                }

                const githubConnection = connections.find(conn => conn.type === "github");
                if (!githubConnection) {
                    setLoading(false);
                    return;
                }

                const username = githubConnection.name;
                const userInfoData = await fetchUserInfo(username);
                if (userInfoData) {
                    setUserInfo(userInfoData);
                }

                const githubId = githubConnection.id;

                if (!settings.store.showInMiniProfile) setReturnJustButton(true);

                // Try to fetch by ID first, fall back to username
                const reposById = await fetchReposByUserId(githubId);
                if (reposById) {
                    setRepos(reposById);
                    setLoading(false);
                    return;
                }

                const reposByUsername = await fetchReposByUsername(username);
                setRepos(reposByUsername);
                setLoading(false);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Failed to fetch repositories";
                setError(errorMessage);
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) return <Text variant="text-xs/semibold" className={cl("loading")} style={{ color: "var(--header-secondary)" }}>
        Loading repositories...</Text>;

    if (error) return <Text variant="text-xs/semibold" className={cl("error")} style={{ color: "var(--text-danger)" }}>
        Error: {error}</Text>;

    if (!repos.length) return null;

    if (returnJustButton) {
        return (
            <Button
                className={cl("button")}
                size={Button.Sizes.SMALL}
                look={Button.Looks.OUTLINED}
                color={Button.Colors.TRANSPARENT}
                onClick={openReposModal}
            >
                Show GitHub Repositories
            </Button>
        );
    }

    const topRepos = repos.slice(0, 4);

    return (
        <div className={cl("container")}>
            <Text variant="text-xs/semibold" className={cl("header")} style={{ color: "var(--header-secondary)" }}>
                GitHub Repositories
                {userInfo && (
                    <span className={cl("count")} style={{ color: "var(--text-muted)" }}>
                        {` (Showing only top ${topRepos.length}/${userInfo.totalRepos})`}
                    </span>
                )}
            </Text>
            <div className={cl("list")}>
                {topRepos.map(repo => (
                    <RepoCard
                        key={repo.id}
                        repo={repo}
                        showStars={settings.store.showStars}
                        showLanguage={settings.store.showLanguage}
                    />))
                }
            </div>
            <div className={cl("footer")}>
                <Button
                    className={cl("show-more")}
                    size={Button.Sizes.SMALL}
                    look={Button.Looks.OUTLINED}
                    color={Button.Colors.TRANSPARENT}
                    onClick={openReposModal}
                >
                    Show More
                </Button>
            </div>
        </div>
    );
}
