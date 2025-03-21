import { Flex } from "@components/Flex";
import { openModal } from "@utils/modal";
import { UserProfileStore, React, useEffect, useState } from "@webpack/common";
import { fetchReposByUserId, fetchReposByUsername, fetchUserInfo, GitHubUserInfo } from "../services/githubApi";
import { GitHubRepo } from "../types";
import { settings } from "../utils/settings";
import { RepoCard } from "./RepoCard";
import { ReposModal } from "./ReposModal";

export function GitHubReposComponent({ id, theme }: { id: string, theme: string; }) {
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<GitHubUserInfo | null>(null);

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

    if (loading) return <div className="vc-github-repos-loading">Loading repositories...</div>;
    if (error) return <div className="vc-github-repos-error">Error: {error}</div>;
    if (!repos.length) return null;

    const topRepos = repos.slice(0, 3);

    return (
        <div className="vc-github-repos-container">
            <div className="vc-github-repos-header">
                GitHub Repositories
                {userInfo && (
                    <span className="vc-github-repos-count">
                        {` (${topRepos.length}/${userInfo.totalRepos})`}
                    </span>
                )}
            </div>
            <Flex className="vc-github-repos-list" flexDirection="column">
                {topRepos.map(repo => (
                    <RepoCard
                        repo={repo}
                        theme={theme}
                        showStars={settings.store.showStars}
                        showLanguage={settings.store.showLanguage}
                    />
                ))}
            </Flex>
            <div className="vc-github-repos-footer">
                <button
                    className="vc-github-repos-show-more"
                    onClick={openReposModal}
                >
                    Show More
                </button>
            </div>
        </div>
    );
} 