/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ErrorCard } from "@components/ErrorCard";
import { DeleteIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { useAwaiter } from "@utils/react";
import { getRepo, shortGitHash, UpdateLogger } from "@utils/updater";
import { Alerts, Button, Card, Forms, React, Toasts } from "@webpack/common";

import gitHash from "~git-hash";

import {
    ChangelogEntry,
    ChangelogHistory,
    clearChangelogHistory,
    clearIndividualLog,
    formatTimestamp,
    getChangelogHistory,
    getCommitsSinceLastSeen,
    getLastRepositoryCheckHash,
    getNewPlugins,
    getNewSettings,
    getNewSettingsEntries,
    getNewSettingsSize,
    getUpdatedPlugins,
    initializeChangelog,
    saveUpdateSession,
    UpdateSession,
} from "./changelogManager";
import { NewPluginsCompact, NewPluginsSection } from "./NewPluginsSection";

function HashLink({
    repo,
    hash,
    disabled = false,
}: {
    repo: string;
    hash: string;
    disabled?: boolean;
}) {
    return (
        <Link href={`${repo}/commit/${hash}`} disabled={disabled}>
            {hash}
        </Link>
    );
}

function ChangelogCard({
    entry,
    repo,
    repoPending,
}: {
    entry: ChangelogEntry;
    repo: string;
    repoPending: boolean;
}) {
    return (
        <Card className="vc-changelog-entry">
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25em",
                }}
            >
                <div className="vc-changelog-entry-header">
                    <code className="vc-changelog-entry-hash">
                        <HashLink
                            repo={repo}
                            hash={entry.hash.slice(0, 7)}
                            disabled={repoPending}
                        />
                    </code>
                    <span className="vc-changelog-entry-author">
                        by {entry.author}
                    </span>
                </div>
                <div className="vc-changelog-entry-message">
                    {entry.message}
                </div>
            </div>
        </Card>
    );
}

function UpdateLogCard({
    log,
    repo,
    repoPending,
    isExpanded,
    onToggleExpand,
    onClearLog,
}: {
    log: UpdateSession;
    repo: string;
    repoPending: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onClearLog: (logId: string) => void;
}) {
    const isRepositoryFetch =
        log.type === "repository_fetch" ||
        (log.type === undefined &&
            log.fromHash === log.toHash &&
            log.commits.length === 0);
    const isUpToDate = log.fromHash === log.toHash;

    return (
        <Card className="vc-changelog-log">
            <div className="vc-changelog-log-header" onClick={onToggleExpand}>
                <div className="vc-changelog-log-info">
                    <div className="vc-changelog-log-title">
                        <span>
                            {isRepositoryFetch
                                ? isUpToDate
                                    ? `Repository check: ${log.fromHash.slice(0, 7)} (up to date)`
                                    : `Repository check: ${log.fromHash.slice(0, 7)} → ${log.toHash.slice(0, 7)}`
                                : `Update: ${log.fromHash.slice(0, 7)} → ${log.toHash.slice(0, 7)}`}
                        </span>
                        <Button
                            size={Button.Sizes.NONE}
                            color={Button.Colors.TRANSPARENT}
                            look={Button.Looks.BLANK}
                            className="vc-changelog-delete-button"
                            style={{
                                padding: "4px",
                                color: "var(--status-danger)",
                                opacity: 0.6,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            onClick={e => {
                                e.stopPropagation();
                                onClearLog(log.id);
                            }}
                        >
                            <DeleteIcon width={16} height={16} />
                        </Button>
                    </div>
                    <div className="vc-changelog-log-meta">
                        {formatTimestamp(log.timestamp)}
                        {log.commits.length > 0 &&
                            ` • ${log.commits.length} commits available`}
                        {log.commits.length === 0 && " • No new commits"}
                        {log.newPlugins.length > 0 &&
                            ` • ${log.newPlugins.length} new plugins`}
                        {log.updatedPlugins.length > 0 &&
                            ` • ${log.updatedPlugins.length} updated plugins`}
                        {log.newSettings &&
                            getNewSettingsSize(log.newSettings) > 0 &&
                            ` • ${getNewSettingsEntries(log.newSettings).reduce((sum, [, arr]) => sum + arr.length, 0)} new settings`}
                    </div>
                </div>
                <div
                    className={`vc-changelog-log-toggle ${isExpanded ? "expanded" : ""}`}
                >
                    ▼
                </div>
            </div>

            {isExpanded && (
                <div className="vc-changelog-log-content">
                    {log.newPlugins.length > 0 && (
                        <div className="vc-changelog-log-plugins">
                            <NewPluginsCompact
                                newPlugins={log.newPlugins}
                                maxDisplay={50}
                            />
                        </div>
                    )}

                    {log.updatedPlugins.length > 0 && (
                        <div className="vc-changelog-log-plugins">
                            <Forms.FormTitle
                                tag="h6"
                                className={Margins.bottom8}
                            >
                                Updated Plugins
                            </Forms.FormTitle>
                            <NewPluginsCompact
                                newPlugins={log.updatedPlugins}
                                maxDisplay={50}
                            />
                        </div>
                    )}

                    {log.newSettings &&
                        getNewSettingsSize(log.newSettings) > 0 && (
                            <div className="vc-changelog-log-plugins">
                                <Forms.FormTitle
                                    tag="h6"
                                    className={Margins.bottom8}
                                >
                                    New Settings
                                </Forms.FormTitle>
                                <div className="vc-changelog-new-plugins-list">
                                    {getNewSettingsEntries(log.newSettings).map(
                                        ([pluginName, settings]) =>
                                            settings.map(setting => (
                                                <span
                                                    key={`${pluginName}-${setting}`}
                                                    className="vc-changelog-new-plugin-tag"
                                                    title={`New setting in ${pluginName}`}
                                                >
                                                    {pluginName}.{setting}
                                                </span>
                                            )),
                                    )}
                                </div>
                            </div>
                        )}

                    {log.commits.length > 0 && (
                        <div className="vc-changelog-log-commits">
                            <div className="vc-changelog-log-commits-list">
                                {log.commits.map(entry => (
                                    <ChangelogCard
                                        key={entry.hash}
                                        entry={entry}
                                        repo={repo}
                                        repoPending={repoPending}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

function ChangelogContent() {
    const [repo, repoErr, repoPending] = useAwaiter(getRepo, {
        fallbackValue: "Loading...",
    });
    const [changelog, setChangelog] = React.useState<ChangelogEntry[]>([]);
    const [changelogHistory, setChangelogHistory] =
        React.useState<ChangelogHistory>([]);
    const [newPlugins, setNewPlugins] = React.useState<string[]>([]);
    const [updatedPlugins, setUpdatedPlugins] = React.useState<string[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [expandedLogs, setExpandedLogs] = React.useState<Set<string>>(
        new Set(),
    );
    const [showHistory, setShowHistory] = React.useState(false);
    const [recentlyChecked, setRecentlyChecked] = React.useState(false);

    React.useEffect(() => {
        const init = async () => {
            try {
                await initializeChangelog();
                await loadChangelogHistory();
            } catch (err) {
                console.error("Failed to initialize changelog:", err);
            }
        };
        init();
    }, []);

    React.useEffect(() => {
        if (repoErr) {
            UpdateLogger.error("Failed to retrieve repo", repoErr);
            setError("Failed to retrieve repository information");
        }
    }, [repoErr]);

    const loadChangelogHistory = React.useCallback(async () => {
        try {
            const history = await getChangelogHistory();
            setChangelogHistory(history);
        } catch (err) {
            console.error("Failed to load changelog history:", err);
        }
    }, []);

    const loadNewPlugins = React.useCallback(async () => {
        try {
            const newPlgs = await getNewPlugins();
            const updatedPlgs = await getUpdatedPlugins();
            setNewPlugins(newPlgs);
            setUpdatedPlugins(updatedPlgs);
        } catch (err) {
            console.error("Failed to load new plugins:", err);
        }
    }, []);

    const ensureLocalUpdateLogged = React.useCallback(async () => {
        if (repoPending || repoErr) return false;
        const repoUrl = repo;
        if (!repoUrl) return false;

        try {
            const commits = await getCommitsSinceLastSeen(repoUrl);
            if (commits.length === 0) return false;

            const newPlgs = await getNewPlugins();
            const updatedPlgs = await getUpdatedPlugins();
            const newSettings = await getNewSettings();

            await saveUpdateSession(commits, newPlgs, updatedPlgs, newSettings);

            setChangelog(commits);
            setNewPlugins(newPlgs);
            setUpdatedPlugins(updatedPlgs);
            await loadChangelogHistory();
            return true;
        } catch (err) {
            console.error("Failed to log local update:", err);
            return false;
        }
    }, [repo, repoErr, repoPending, loadChangelogHistory]);

    // check if the repository was recently refreshed
    React.useEffect(() => {
        const checkRecentStatus = async () => {
            try {
                const lastRepoCheck = await getLastRepositoryCheckHash();
                const updates = await VencordNative.updater.getUpdates();

                if (updates.ok) {
                    const currentRepoHash =
                        updates.value.length > 0
                            ? updates.value[0].hash
                            : gitHash;
                    setRecentlyChecked(lastRepoCheck === currentRepoHash);
                }
            } catch (err) {
                // ignore errors (hopefully there are none lol)
                setRecentlyChecked(false);
            }
        };

        if (!repoPending && !repoErr) {
            checkRecentStatus();
        }
    }, [repoPending, repoErr]);

    const fetchChangelog = React.useCallback(async () => {
        if (repoPending || repoErr) return;

        setIsLoading(true);
        setError(null);

        try {
            // check if the repository was recently refreshed and that nothing has changed
            const updates = await VencordNative.updater.getUpdates();
            const lastRepoCheck = await getLastRepositoryCheckHash();
            const currentRepoHash =
                updates.ok && updates.value.length > 0
                    ? updates.value[0].hash
                    : gitHash;

            // If repository state hasn't changed since last check
            if (lastRepoCheck === currentRepoHash) {
                setIsLoading(false);
                setRecentlyChecked(true);
                const logged = await ensureLocalUpdateLogged();
                if (!logged) {
                    setChangelog([]);
                    Toasts.show({
                        message: "Already up to date with repository",
                        id: Toasts.genId(),
                        type: Toasts.Type.MESSAGE,
                        options: {
                            position: Toasts.Position.BOTTOM,
                        },
                    });
                }
                return;
            }

            if (updates.ok && updates.value) {
                if (updates.value.length > 0) {
                    setChangelog(updates.value);

                    const newPlgs = await getNewPlugins();
                    const updatedPlgs = await getUpdatedPlugins();
                    const newSettings = await getNewSettings();
                    setNewPlugins(newPlgs);
                    setUpdatedPlugins(updatedPlgs);

                    await saveUpdateSession(
                        updates.value,
                        newPlgs,
                        updatedPlgs,
                        newSettings,
                        true,
                    );
                    await loadChangelogHistory();
                    setRecentlyChecked(true);

                    Toasts.show({
                        message: `Found ${updates.value.length} commit${updates.value.length === 1 ? "" : "s"} from repository`,
                        id: Toasts.genId(),
                        type: Toasts.Type.SUCCESS,
                        options: {
                            position: Toasts.Position.BOTTOM,
                        },
                    });
                } else {
                    const logged = await ensureLocalUpdateLogged();
                    setRecentlyChecked(true);
                    Toasts.show({
                        message: logged
                            ? "Logged commits from your latest update"
                            : "Repository is up to date with your local copy",
                        id: Toasts.genId(),
                        type: logged ? Toasts.Type.SUCCESS : Toasts.Type.MESSAGE,
                        options: {
                            position: Toasts.Position.BOTTOM,
                        },
                    });
                    if (!logged) {
                        setChangelog([]);
                    }
                }
            } else if (!updates.ok) {
                throw new Error(
                    updates.error?.message || "Failed to fetch from repository",
                );
            }
        } catch (err: any) {
            UpdateLogger.error("Failed to fetch commits from repository", err);
            const errorMessage =
                err?.message ||
                "Failed to connect to repository. Check your internet connection.";
            setError(errorMessage);

            // funny little error toast hopefully doesn't happen!
            Toasts.show({
                message: "Could not fetch commits from repository",
                id: Toasts.genId(),
                type: Toasts.Type.FAILURE,
                options: {
                    position: Toasts.Position.BOTTOM,
                },
            });
        } finally {
            setIsLoading(false);
        }
    }, [repoPending, repoErr, loadNewPlugins, loadChangelogHistory]);

    React.useEffect(() => {
        const loadInitialData = async () => {
            if (!repoPending && !repoErr) {
                await loadNewPlugins();
                const logged = await ensureLocalUpdateLogged();
                if (!logged) {
                    await fetchChangelog();
                } else {
                    setIsLoading(false);
                }
            } else if (!repoPending) {
                // perseverance
                await loadNewPlugins();
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, [
        repoPending,
        repoErr,
        fetchChangelog,
        loadNewPlugins,
        ensureLocalUpdateLogged,
    ]);

    const toggleLogExpanded = (logId: string) => {
        const newExpanded = new Set(expandedLogs);
        if (newExpanded.has(logId)) {
            newExpanded.delete(logId);
        } else {
            newExpanded.add(logId);
        }
        setExpandedLogs(newExpanded);
    };

    const hasCurrentChanges =
        changelog.length > 0 ||
        newPlugins.length > 0 ||
        updatedPlugins.length > 0;

    return (
        <>
            <Forms.FormText className={Margins.bottom16}>
                View the most recent changes to Equicord. This fetches commits
                directly from the repository to show you what's new.
            </Forms.FormText>

            <Forms.FormTitle tag="h5">Repository</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>
                {repoPending ? (
                    repo
                ) : repoErr ? (
                    "Failed to retrieve - check console"
                ) : (
                    <Link href={repo}>
                        {repo.split("/").slice(-2).join("/")}
                    </Link>
                )}{" "}
                (Current:{" "}
                <span className="vc-changelog-current-hash">
                    {shortGitHash()}
                </span>
                )
            </Forms.FormText>

            <div className="vc-changelog-controls">
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={isLoading || repoPending || !!repoErr}
                    onClick={fetchChangelog}
                    color={
                        recentlyChecked
                            ? Button.Colors.GREEN
                            : Button.Colors.BRAND
                    }
                >
                    {isLoading
                        ? "Loading..."
                        : recentlyChecked
                            ? "Repository Up to Date"
                            : "Fetch from Repository"}
                </Button>

                {changelogHistory.length > 0 && (
                    <>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={
                                showHistory
                                    ? Button.Colors.PRIMARY
                                    : Button.Colors.BRAND
                            }
                            onClick={() => setShowHistory(!showHistory)}
                            style={{ marginLeft: "8px" }}
                        >
                            {showHistory ? "Hide Logs" : "Show Logs"}
                        </Button>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.RED}
                            onClick={() => {
                                Alerts.show({
                                    title: "Clear All Logs",
                                    body: "Are you sure you would like to clear all logs? This can't be undone.",
                                    confirmText: "Clear All",
                                    confirmColor: "danger",
                                    cancelText: "Cancel",
                                    onConfirm: async () => {
                                        await clearChangelogHistory();
                                        await loadChangelogHistory();
                                        setShowHistory(false);
                                        Toasts.show({
                                            message:
                                                "All logs have been cleared",
                                            id: Toasts.genId(),
                                            type: Toasts.Type.SUCCESS,
                                            options: {
                                                position:
                                                    Toasts.Position.BOTTOM,
                                            },
                                        });
                                    },
                                });
                            }}
                            style={{ marginLeft: "8px" }}
                        >
                            Clear All Logs
                        </Button>
                    </>
                )}
            </div>

            {error && (
                <ErrorCard style={{ padding: "1em", marginBottom: "1em" }}>
                    <p>{error}</p>
                    <Forms.FormText
                        style={{
                            marginTop: "0.5em",
                            color: "var(--text-muted)",
                        }}
                    >
                        Make sure you have an internet connection and try again.
                    </Forms.FormText>
                </ErrorCard>
            )}

            <Forms.FormDivider className={Margins.bottom16} />

            {/* Current Changes Section */}
            {hasCurrentChanges ? (
                <div className="vc-changelog-current">
                    <Forms.FormTitle tag="h6" className={Margins.bottom8}>
                        Recent Changes
                    </Forms.FormTitle>

                    {/* New Plugins Section */}
                    {newPlugins.length > 0 && (
                        <div className={Margins.bottom16}>
                            <NewPluginsSection
                                newPlugins={newPlugins}
                                onPluginToggle={(pluginName, enabled) => {
                                    // Handle plugin toggle if needed
                                }}
                            />
                        </div>
                    )}

                    {/* Updated Plugins Section */}
                    {updatedPlugins.length > 0 && (
                        <div className={Margins.bottom16}>
                            <Forms.FormTitle
                                tag="h6"
                                className={Margins.bottom8}
                            >
                                Updated Plugins ({updatedPlugins.length})
                            </Forms.FormTitle>
                            <NewPluginsCompact newPlugins={updatedPlugins} />
                        </div>
                    )}

                    {/* Code Changes */}
                    {changelog.length > 0 && (
                        <div>
                            <Forms.FormTitle
                                tag="h6"
                                className={Margins.bottom8}
                            >
                                Code Changes ({changelog.length}{" "}
                                {changelog.length === 1 ? "commit" : "commits"})
                            </Forms.FormTitle>
                            <div className="vc-changelog-commits-list">
                                {changelog.map(entry => (
                                    <ChangelogCard
                                        key={entry.hash}
                                        entry={entry}
                                        repo={repo}
                                        repoPending={repoPending}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                !isLoading &&
                !error && (
                    <Card className="vc-changelog-empty">
                        <Forms.FormText>
                            No commits available ahead of your current version.
                            Click "Fetch from Repository" to check for new
                            changes.
                        </Forms.FormText>
                    </Card>
                )
            )}

            {/* History Section */}
            {showHistory && changelogHistory.length > 0 && (
                <div className="vc-changelog-history">
                    <Forms.FormDivider
                        className={Margins.top16}
                        style={{ marginBottom: "1em" }}
                    />
                    <Forms.FormTitle tag="h5" className={Margins.bottom8}>
                        Update Logs ({changelogHistory.length}{" "}
                        {changelogHistory.length === 1 ? "log" : "logs"})
                    </Forms.FormTitle>
                    <Forms.FormText className={Margins.bottom16}>
                        Previous update sessions with their commit history and
                        plugin changes.
                    </Forms.FormText>

                    <div className="vc-changelog-history-list">
                        {changelogHistory.map(log => (
                            <UpdateLogCard
                                key={log.id}
                                log={log}
                                repo={repo}
                                repoPending={repoPending}
                                isExpanded={expandedLogs.has(log.id)}
                                onToggleExpand={() => toggleLogExpanded(log.id)}
                                onClearLog={logId => {
                                    Alerts.show({
                                        title: "Clear Log",
                                        body: "Are you sure you would like to clear this log? This can't be undone.",
                                        confirmText: "Clear Log",
                                        confirmColor: "danger",
                                        cancelText: "Cancel",
                                        onConfirm: async () => {
                                            await clearIndividualLog(logId);
                                            await loadChangelogHistory();
                                            setExpandedLogs(
                                                new Set(
                                                    Array.from(
                                                        expandedLogs,
                                                    ).filter(
                                                        id => id !== logId,
                                                    ),
                                                ),
                                            );
                                            Toasts.show({
                                                message: "Log has been cleared",
                                                id: Toasts.genId(),
                                                type: Toasts.Type.SUCCESS,
                                                options: {
                                                    position:
                                                        Toasts.Position.BOTTOM,
                                                },
                                            });
                                        },
                                    });
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

function ChangelogTab() {
    return (
        <SettingsTab title="Changelog">
            <ChangelogContent />
        </SettingsTab>
    );
}

export default wrapTab(ChangelogTab, "Changelog");
