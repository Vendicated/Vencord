/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { relaunch } from "@utils/native";
import { changes, checkForUpdates, update, updateError } from "@utils/updater";
import { Alerts, Button, Card, Forms, React, Toasts, useState } from "@webpack/common";

import { runWithDispatch } from "./runWithDispatch";

export interface CommonProps {
    repo: string;
    repoPending: boolean;
}

export function HashLink({ repo, hash, disabled = false }: { repo: string, hash: string, disabled?: boolean; }) {
    return (
        <Link href={`${repo}/commit/${hash}`} disabled={disabled}>
            {hash}
        </Link>
    );
}

export function Changes({ updates, repo, repoPending }: CommonProps & { updates: typeof changes; }) {
    return (
        <Card style={{ padding: "0 0.5em" }}>
            {updates.map(({ hash, author, message }) => (
                <div
                    key={hash}
                    style={{
                        marginTop: "0.5em",
                        marginBottom: "0.5em"
                    }}
                >
                    <code>
                        <HashLink {...{ repo, hash }} disabled={repoPending} />
                    </code>

                    <span style={{
                        marginLeft: "0.5em",
                        color: "var(--text-default)"
                    }}>
                        {message} - {author}
                    </span>
                </div>
            ))}
        </Card>
    );
}

export function Newer(props: CommonProps) {
    return (
        <>
            <Forms.FormText className={Margins.bottom8}>
                Your local copy has more recent commits. Please stash or reset them.
            </Forms.FormText>
            <Changes {...props} updates={changes} />
        </>
    );
}

export function Updatable(props: CommonProps) {
    const [updates, setUpdates] = useState(changes);
    const [isChecking, setIsChecking] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const isOutdated = (updates?.length ?? 0) > 0;

    return (
        <>
            {!updates && updateError ? (
                <>
                    <Forms.FormText>Failed to check updates. Check the console for more info</Forms.FormText>
                    <ErrorCard style={{ padding: "1em" }}>
                        <p>{updateError.stderr || updateError.stdout || "An unknown error occurred"}</p>
                    </ErrorCard>
                </>
            ) : (
                <Forms.FormText className={Margins.bottom8}>
                    {isOutdated ? (updates.length === 1 ? "There is 1 Update" : `There are ${updates.length} Updates`) : "Up to Date!"}
                </Forms.FormText>
            )}

            {isOutdated && <Changes updates={updates} {...props} />}

            <Flex className={classes(Margins.bottom8, Margins.top8)}>
                {isOutdated && (
                    <Button
                        size={Button.Sizes.SMALL}
                        disabled={isUpdating || isChecking}
                        onClick={runWithDispatch(setIsUpdating, async () => {
                            if (await update()) {
                                setUpdates([]);

                                await new Promise<void>(r => {
                                    Alerts.show({
                                        title: "Update Success!",
                                        body: "Successfully updated. Restart now to apply the changes?",
                                        confirmText: "Restart",
                                        cancelText: "Not now!",
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
                        Update Now
                    </Button>
                )}
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={isUpdating || isChecking}
                    onClick={runWithDispatch(setIsChecking, async () => {
                        const outdated = await checkForUpdates();

                        if (outdated) {
                            setUpdates(changes);
                        } else {
                            setUpdates([]);

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
