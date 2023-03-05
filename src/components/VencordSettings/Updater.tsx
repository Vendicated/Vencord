/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { showNotification } from "@api/Notifications";
import { useSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { handleComponentFailed } from "@components/handleComponentFailed";
import { Link } from "@components/Link";
import { Margins } from "@utils/margins";
import { classes, useAwaiter, useForceUpdater } from "@utils/misc";
import { changes, checkForUpdates, getBranches, getRepo, isNewer, rebuild, switchBranch, update, updateError, UpdateLogger } from "@utils/updater";
import { Alerts, Button, Card, Forms, Parser, React, Select, Switch, Toasts } from "@webpack/common";

import gitHash from "~git-hash";

function withDispatcher(dispatcher: React.Dispatch<React.SetStateAction<boolean>>, action: () => any) {
    return async () => {
        dispatcher(true);
        try {
            await action();
        } catch (e: any) {
            UpdateLogger.error("Failed to update", e);
            if (!e) {
                var err = "An unknown error occurred (error is undefined).\nPlease try again.";
            } else if (e.code && e.cmd) {
                const { code, path, cmd, stderr } = e;

                if (code === "ENOENT")
                    var err = `Command \`${path}\` not found.\nPlease install it and try again`;
                else {
                    var err = `An error occured while running \`${cmd}\`:\n`;
                    err += stderr || `Code \`${code}\`. See the console for more info`;
                }

            } else {
                var err = "An unknown error occurred. See the console for more info.";
            }
            Alerts.show({
                title: "Oops!",
                body: (
                    <ErrorCard>
                        {err.split("\n").map(line => <div>{Parser.parse(line)}</div>)}
                    </ErrorCard>
                )
            });
        }
        finally {
            dispatcher(false);
        }
    };
}

interface CommonProps {
    repo: string;
    repoPending: boolean;
}

function HashLink({ repo, hash, disabled = false }: { repo: string, hash: string, disabled?: boolean; }) {
    return <Link href={`${repo}/commit/${hash}`} disabled={disabled}>
        {hash}
    </Link>;
}

function Changes({ updates, repo, repoPending }: CommonProps & { updates: typeof changes; }) {
    return (
        <Card style={{ padding: ".5em" }}>
            {updates.map(({ hash, author, message }) => (
                <div>
                    <code><HashLink {...{ repo, hash }} disabled={repoPending} /></code>
                    <span style={{
                        marginLeft: "0.5em",
                        color: "var(--text-normal)"
                    }}>{message} - {author}</span>
                </div>
            ))}
        </Card>
    );
}

function Updatable(props: CommonProps) {
    const [isChecking, setIsChecking] = React.useState(false);
    const [isUpdating, setIsUpdating] = React.useState(false);

    const isOutdated = (changes?.length ?? 0) > 0;

    return (
        <>
            {!changes && updateError ? (
                <>
                    <Forms.FormText>Failed to check updates. Check the console for more info</Forms.FormText>
                    <ErrorCard style={{ padding: "1em" }}>
                        <p>{updateError.stderr || updateError.stdout || "An unknown error occurred"}</p>
                    </ErrorCard>
                </>
            ) : (
                <Forms.FormText className={Margins.bottom8}>
                    {isOutdated ? `There are ${changes.length} Updates` : "Up to Date!"}
                </Forms.FormText>
            )}

            {isOutdated && <Changes updates={changes} {...props} />}

            <Flex className={classes(Margins.bottom8, Margins.top8)}>
                {isOutdated && <Button
                    size={Button.Sizes.SMALL}
                    disabled={isUpdating || isChecking}
                    onClick={withDispatcher(setIsUpdating, async () => {
                        if (await update()) {
                            changes.splice(0, changes.length - 1);
                            const needFullRestart = await rebuild();
                            await new Promise<void>(r => {
                                Alerts.show({
                                    title: "Update Success!",
                                    body: "Successfully updated. Restart now to apply the changes?",
                                    confirmText: "Restart",
                                    cancelText: "Not now!",
                                    onConfirm() {
                                        if (needFullRestart)
                                            window.DiscordNative.app.relaunch();
                                        else
                                            location.reload();
                                        r();
                                    },
                                    onCancel: r
                                });
                            });
                        }
                    })}
                >
                    Update Now
                </Button>}
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={isUpdating || isChecking}
                    onClick={withDispatcher(setIsChecking, async () => {
                        const outdated = await checkForUpdates();
                        if (!outdated) {
                            Toasts.show({
                                message: "No updates found!",
                                id: Toasts.genId(),
                                type: Toasts.Type.MESSAGE,
                                options: {
                                    position: Toasts.Position.BOTTOM
                                }
                            });
                        }
                    })}
                >
                    Check for Updates
                </Button>
            </Flex>
        </>
    );
}

function Newer(props: CommonProps) {
    return (
        <>
            <Forms.FormText className={Margins.bottom8}>
                Your local copy has more recent commits. Please stash or reset them.
            </Forms.FormText>
            <Changes {...props} updates={changes} />
        </>
    );
}

function Updater() {
    const settings = useSettings(["notifyAboutUpdates", "autoUpdate"]);

    const [repo, repoErr, repoPending] = useAwaiter(getRepo, { fallbackValue: "Loading repo..." });
    const [branches, branchesErr] = useAwaiter(getBranches, { fallbackValue: [settings.branch] });

    const forceUpdate = useForceUpdater();

    React.useEffect(() => {
        if (repoErr) UpdateLogger.error("Failed to retrieve repo", repoErr);
        if (branchesErr) UpdateLogger.error("Failed to retrieve branches", branchesErr);
    }, [repoErr, branchesErr]);

    const commonProps: CommonProps = {
        repo,
        repoPending
    };

    let selectedBranch = settings.branch;

    async function onBranchSelect(branch: string) {
        selectedBranch = branch;
        try {
            if (await switchBranch(branch)) {
                settings.branch = branch;

                await checkForUpdates();
                forceUpdate();
            } else
                throw new Error("Failed to build or fetch new branch.");
        } catch (err) {
            UpdateLogger.error(err);
            showNotification({
                title: "Failed to switch branch",
                body: "Your branch was changed back to what it was before. Check your console!"
            });
            forceUpdate();
        }
    }

    return (
        <Forms.FormSection className={Margins.top16}>
            <Forms.FormTitle tag="h5">Updater Settings</Forms.FormTitle>
            <Switch
                value={settings.notifyAboutUpdates}
                onChange={(v: boolean) => settings.notifyAboutUpdates = v}
                note="Shows a toast on startup"
                disabled={settings.autoUpdate}
            >
                Get notified about new updates
            </Switch>
            <Switch
                value={settings.autoUpdate}
                onChange={(v: boolean) => settings.autoUpdate = v}
                note="Automatically update Vencord without confirmation prompt"
            >
                Automatically update
            </Switch>

            <Forms.FormTitle tag="h5">Repo</Forms.FormTitle>

            <div className="vc-updater-repo-container">
                <Forms.FormText>
                    {repoErr
                        ? "Failed to retrieve repo - check console"
                        : repoPending
                            ? repo
                            : (
                                <Link href={repo}>
                                    {repo.split("/").slice(-2).join("/")}
                                </Link>
                            )}(<HashLink hash={gitHash} repo={repo} disabled={repoPending} />)
                </Forms.FormText>
                <Select
                    options={branches.map(branch => ({ label: branch, value: branch, default: branch === selectedBranch }))}
                    serialize={String}
                    select={onBranchSelect}
                    isSelected={v => v === selectedBranch}
                    closeOnSelect={true}
                    className="vc-updater-branch-select-menu"
                />
            </div>

            <Forms.FormDivider className={Margins.top8 + " " + Margins.bottom8} />

            <Forms.FormTitle tag="h5">Updates</Forms.FormTitle>

            {isNewer ? <Newer {...commonProps} /> : <Updatable {...commonProps} />}
        </Forms.FormSection >
    );
}

export default IS_WEB ? null : ErrorBoundary.wrap(Updater, {
    message: "Failed to render the Updater. If this persists, try using the installer to reinstall!",
    onError: handleComponentFailed,
});
