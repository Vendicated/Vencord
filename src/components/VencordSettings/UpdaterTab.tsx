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

import { useSettings } from "@api/Settings";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { getLanguage } from "@languages/Language";
import { formatText } from "@languages/LanguageUtils";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { relaunch } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { changes, checkForUpdates, getRepo, isNewer, update, updateError, UpdateLogger } from "@utils/updater";
import { Alerts, Button, Card, Forms, Parser, React, Switch, Toasts } from "@webpack/common";

import gitHash from "~git-hash";

import { handleSettingsTabError, SettingsTab, wrapTab } from "./shared";

const langData = getLanguage("components");

function withDispatcher(dispatcher: React.Dispatch<React.SetStateAction<boolean>>, action: () => any) {
    const l = langData.VencordSettings.UpdaterTab.withDispatcher;
    return async () => {
        dispatcher(true);
        try {
            await action();
        } catch (e: any) {
            UpdateLogger.error("Failed to update", e);

            let err: string;
            if (!e) {
                err = l.undefinedError;
            } else if (e.code && e.cmd) {
                const { code, path, cmd, stderr } = e;

                if (code === "ENOENT")
                    err = formatText(l.commandNotFound, { path: path });
                else {
                    err = formatText(l.errorWhileRun, { cmd: cmd });
                    err += stderr || formatText(l.code, { code: code });
                }

            } else {
                err = l.unknownError;
            }

            Alerts.show({
                title: l.oops,
                body: (
                    <ErrorCard>
                        {err.split("\n").map((line, idx) => <div key={idx}>{Parser.parse(line)}</div>)}
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
        <Card style={{ padding: "0 0.5em" }}>
            {updates.map(({ hash, author, message }) => (
                <div key={hash} style={{
                    marginTop: "0.5em",
                    marginBottom: "0.5em"
                }}>
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
    const [updates, setUpdates] = React.useState(changes);
    const [isChecking, setIsChecking] = React.useState(false);
    const [isUpdating, setIsUpdating] = React.useState(false);

    const isOutdated = (updates?.length ?? 0) > 0;
    const l = langData.VencordSettings.UpdaterTab.Updatable;

    return (
        <>
            {!updates && updateError ? (
                <>
                    <Forms.FormText>{l.failedCheck}</Forms.FormText>
                    <ErrorCard style={{ padding: "1em" }}>
                        <p>{updateError.stderr || updateError.stdout || l.unknownError}</p>
                    </ErrorCard>
                </>
            ) : (
                <Forms.FormText className={Margins.bottom8}>
                    {isOutdated ? (updates.length === 1 ? l.oneUpdate : formatText(l.moreUpdates, { updatesLength: updates.length })) : l.upToDate}
                </Forms.FormText>
            )}

            {isOutdated && <Changes updates={updates} {...props} />}

            <Flex className={classes(Margins.bottom8, Margins.top8)}>
                {isOutdated && <Button
                    size={Button.Sizes.SMALL}
                    disabled={isUpdating || isChecking}
                    onClick={withDispatcher(setIsUpdating, async () => {
                        if (await update()) {
                            setUpdates([]);
                            await new Promise<void>(r => {
                                Alerts.show({
                                    title: l.updateSuccess,
                                    body: l.restartToApplyTheChanges,
                                    confirmText: l.restart,
                                    cancelText: l.notNow,
                                    onConfirm() {
                                        relaunch();
                                        r();
                                    },
                                    onCancel: r
                                });
                            });
                        }
                    })}
                >
                    {l.updateNow}
                </Button>}
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={isUpdating || isChecking}
                    onClick={withDispatcher(setIsChecking, async () => {
                        const outdated = await checkForUpdates();
                        if (outdated) {
                            setUpdates(changes);
                        } else {
                            setUpdates([]);
                            Toasts.show({
                                message: l.noUpdates,
                                id: Toasts.genId(),
                                type: Toasts.Type.MESSAGE,
                                options: {
                                    position: Toasts.Position.BOTTOM
                                }
                            });
                        }
                    })}
                >
                    {l.checkUpdates}
                </Button>
            </Flex>
        </>
    );
}

function Newer(props: CommonProps) {
    return (
        <>
            <Forms.FormText className={Margins.bottom8}>
                {langData.VencordSettings.UpdaterTab.Newer.localCopyWarning}
            </Forms.FormText>
            <Changes {...props} updates={changes} />
        </>
    );
}

function Updater() {
    const settings = useSettings(["autoUpdate", "autoUpdateNotification"]);
    const l = langData.VencordSettings.UpdaterTab.Updater;

    const [repo, err, repoPending] = useAwaiter(getRepo, { fallbackValue: l.loading });

    React.useEffect(() => {
        if (err)
            UpdateLogger.error("Failed to retrieve repo", err);
    }, [err]);

    const commonProps: CommonProps = {
        repo,
        repoPending
    };

    return (
        <SettingsTab title={l.title}>
            <Forms.FormTitle tag="h5">{l.title}</Forms.FormTitle>
            <Switch
                value={settings.autoUpdate}
                onChange={(v: boolean) => settings.autoUpdate = v}
                note={l.autoUpdateInfo}
            >
                {l.autoUpdate}
            </Switch>
            <Switch
                value={settings.autoUpdateNotification}
                onChange={(v: boolean) => settings.autoUpdateNotification = v}
                note={l.autoUpdateNotifInfo}
                disabled={!settings.autoUpdate}
            >
                {l.autoUpdateNotif}
            </Switch>

            <Forms.FormTitle tag="h5">{l.repo}</Forms.FormTitle>

            <Forms.FormText className="vc-text-selectable">
                {repoPending
                    ? repo
                    : err
                        ? l.failedRetrive
                        : (
                            <Link href={repo}>
                                {repo.split("/").slice(-2).join("/")}
                            </Link>
                        )
                }
                {" "}(<HashLink hash={gitHash} repo={repo} disabled={repoPending} />)
            </Forms.FormText>

            <Forms.FormDivider className={Margins.top8 + " " + Margins.bottom8} />

            <Forms.FormTitle tag="h5">{l.updates}</Forms.FormTitle>

            {isNewer ? <Newer {...commonProps} /> : <Updatable {...commonProps} />}
        </SettingsTab>
    );
}

export default IS_UPDATER_DISABLED ? null : wrapTab(Updater, langData.VencordSettings.UpdaterTab.wrapTab);

export const openUpdaterModal = IS_UPDATER_DISABLED ? null : function () {
    const UpdaterTab = wrapTab(Updater, langData.VencordSettings.UpdaterTab.wrapTab);

    try {
        openModal(wrapTab((modalProps: ModalProps) => (
            <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
                <ModalContent className="vc-updater-modal">
                    <ModalCloseButton onClick={modalProps.onClose} className="vc-updater-modal-close-button" />
                    <UpdaterTab />
                </ModalContent>
            </ModalRoot>
        ), langData.VencordSettings.UpdaterTab.updaterModal));
    } catch {
        handleSettingsTabError();
    }
};
