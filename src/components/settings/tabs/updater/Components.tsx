/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { Span } from "@components/Span";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { changes, checkForUpdates, update, updateError } from "@utils/updater";
import { Alerts, React, Toasts, useState } from "@webpack/common";

import { runWithDispatch } from "./runWithDispatch";

export interface CommonProps {
    repo: string;
    repoPending: boolean;
}

export function HashLink({ repo, hash, disabled = false }: { repo: string, hash: string, disabled?: boolean; }) {
    return (
        <Link href={`${repo}/commit/${hash}`} disabled={disabled}>
            {hash.slice(0, 7)}
        </Link>
    );
}

export function Changes({ updates, repo, repoPending }: CommonProps & { updates: typeof changes; }) {
    return (
        <Card className={Margins.top16} style={{ padding: 0 }} defaultPadding={false}>
            {updates.map(({ hash, author, message }, i) => (
                <div
                    key={hash}
                    style={{
                        padding: "12px 16px",
                        borderBottom: i < updates.length - 1 ? "1px solid var(--border-subtle)" : undefined
                    }}
                >
                    <Flex style={{ alignItems: "center", gap: 8 }}>
                        <code style={{ color: "var(--text-link)" }}>
                            <HashLink {...{ repo, hash }} disabled={repoPending} />
                        </code>
                        <Span size="sm" color="text-default">
                            {message}
                        </Span>
                        <Span size="sm" color="text-subtle">
                            — {author}
                        </Span>
                    </Flex>
                </div>
            ))}
        </Card>
    );
}

export function Newer(props: CommonProps) {
    return (
        <>
            <Paragraph>
                Your local copy has more recent commits than the remote repository. This usually happens when you've made local changes. Please stash or reset them before updating.
            </Paragraph>
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
            <Flex className={Margins.bottom8} gap="8px">
                <Button
                    size="small"
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
                {isOutdated && (
                    <Button
                        size="small"
                        variant="primary"
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
            </Flex>
            {!updates && updateError ? (
                <>
                    <Span size="md" weight="medium" color="text-strong">Error checking for updates</Span>
                    <ErrorCard className={Margins.top8} style={{ padding: "1em" }}>
                        <p>{updateError.stderr || updateError.stdout || "An unknown error occurred"}</p>
                    </ErrorCard>
                </>
            ) : isOutdated ? (
                <>
                    <Paragraph>
                        There {updates.length === 1 ? "is 1 update" : `are ${updates.length} updates`} available. Click the button below to download and install.
                    </Paragraph>
                    <Changes updates={updates} {...props} />
                </>
            ) : (
                <Paragraph>
                    You're running the latest version of Equicord.
                </Paragraph>
            )}
        </>
    );
}
