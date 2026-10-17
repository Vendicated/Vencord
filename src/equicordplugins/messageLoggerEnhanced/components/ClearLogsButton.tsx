/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Alerts, showToast,useState } from "@webpack/common";

import { clearMessagesIDB } from "../db";
import { Flogger } from "../index";

interface ClearLogsButtonProps {
    label?: string;
    onCleared?: () => void;
}

export function ClearLogsButton({ label = "Clear Logs", onCleared }: ClearLogsButtonProps) {
    const [loading, setLoading] = useState(false);
    return (
        <Button
            disabled={loading}
            variant="dangerPrimary"
            onClick={() => Alerts.show({
                title: "Clear Logs",
                body: "Are you sure you want to clear all logs?",
                // @ts-ignore
                confirmVariant: "critical-primary",
                confirmText: "Clear",
                cancelText: "Cancel",
                onConfirm: async () => {
                    setLoading(true);
                    try {
                        await clearMessagesIDB();
                        onCleared?.();
                        showToast({ text: "Cleared Logs", variant: "success" });
                    } catch (err) {
                        Flogger.error("Failed to clear logs", err);
                        showToast({ text: "Failed to clear logs", variant: "critical" });
                    } finally {
                        setLoading(false);
                    }
                },
            })}
        >
            {loading ? "Clearing Logs..." : label}
        </Button>
    );
}
