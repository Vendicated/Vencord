/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useForceUpdater } from "@utils/react";
import { Button, showToast, Toasts, UserStore } from "@webpack/common";
import { useEffect } from "@webpack/common/react";

import {
    getAllIgnoredUsers,
    getTimeRemaining,
    isIgnored,
    removeIgnoredUser,
    type IgnoredUser,
} from "./store";

function IgnoredUserCard({ entry, onRemove }: { entry: IgnoredUser; onRemove: () => void; }) {
    const user = UserStore?.getUser(entry.userId);
    const displayName = user?.globalName || user?.username || entry.username;
    const avatar = user?.getAvatarURL?.(undefined, 32) ?? "";
    const remaining = getTimeRemaining(entry.userId);
    const isExpired = !isIgnored(entry.userId);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "var(--background-secondary)",
                marginBottom: "6px",
                gap: "12px",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                {avatar ? (
                    <img
                        src={avatar}
                        alt=""
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            backgroundColor: "var(--background-tertiary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                        }}
                    >
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <div
                        style={{
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "var(--header-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {displayName}
                    </div>
                    <div
                        style={{
                            fontSize: "12px",
                            color: isExpired ? "var(--text-danger)" : "var(--text-muted)",
                        }}
                    >
                        {isExpired ? "Expired" : `⏱ ${remaining}`}
                    </div>
                </div>
            </div>
            <Button
                size={Button.Sizes.TINY}
                color={Button.Colors.RED}
                onClick={() => {
                    removeIgnoredUser(entry.userId);
                    showToast(`Unignored ${displayName}`, Toasts.Type.SUCCESS);
                    onRemove();
                }}
            >
                Unignore
            </Button>
        </div>
    );
}

export function TempIgnoreSettingsPanel() {
    const forceUpdate = useForceUpdater();

    // Auto-refresh remaining times every 5 seconds
    useEffect(() => {
        const interval = setInterval(forceUpdate, 5000);
        return () => clearInterval(interval);
    }, [forceUpdate]);

    const allIgnored = getAllIgnoredUsers();
    const entries = Object.values(allIgnored).sort((a, b) => a.expiresAt - b.expiresAt);

    return (
        <section style={{ marginTop: "16px" }}>
            <div
                style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    color: "var(--header-secondary)",
                    marginBottom: "8px",
                }}
            >
                Temp-Ignored Users ({entries.length})
            </div>

            {entries.length === 0 ? (
                <div
                    style={{
                        padding: "16px",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: "14px",
                        backgroundColor: "var(--background-secondary)",
                        borderRadius: "8px",
                    }}
                >
                    No users are currently temp-ignored.
                    <br />
                    <span style={{ fontSize: "12px" }}>
                        Right-click a user and select "⏱ Temp Ignore" to get started.
                    </span>
                </div>
            ) : (
                <div>
                    {entries.map(entry => (
                        <IgnoredUserCard
                            key={entry.userId}
                            entry={entry}
                            onRemove={forceUpdate}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
