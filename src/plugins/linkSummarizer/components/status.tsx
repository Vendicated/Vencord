/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { PluginNative } from "@utils/types";
import { Forms, useEffect, useState } from "@webpack/common";

import { settings } from "../settings";

const Native = VencordNative.pluginHelpers.LinkSummarizer as PluginNative<typeof import("../native")>;

export function OllamaStatusIndicator() {
    const [isRunning, setIsRunning] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkOllamaStatus() {
            try {
                const payload = JSON.stringify({
                    model: settings.store.ollamaModel,
                    prompt: "test",
                    stream: false
                });

                const response = await Native.callOllamaApi(settings.store.ollamaHost, payload);
                if (response) {
                    setIsRunning(true);
                    setError(null);
                } else {
                    setIsRunning(false);
                    setError("No response from Ollama");
                }
            } catch (err) {
                console.error("[LinkSummarizer] Ollama status check failed:", err);
                setIsRunning(false);
                setError(err instanceof Error ? err.message : "Unknown error");
            }
        }

        checkOllamaStatus();
        const interval = setInterval(checkOllamaStatus, 30000);
        return () => clearInterval(interval);
    }, [settings.store.ollamaHost]);

    return (
        <ErrorBoundary>
            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "8px",
                marginTop: "8px",
                backgroundColor: isRunning
                    ? "var(--info-positive-background)"
                    : "var(--info-danger-background)",
                borderRadius: "4px"
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                }}>
                    <div style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: isRunning
                            ? "var(--status-positive)"
                            : "var(--status-danger)"
                    }} />
                    <span style={{ color: "var(--text-normal)" }}>
                        Ollama is {isRunning ? "running" : "not running"}
                    </span>
                </div>
                {!isRunning && error && (
                    <Forms.FormText style={{
                        color: "var(--text-danger)",
                        fontSize: "12px",
                        marginLeft: "16px"
                    }}>
                        Error: {error}
                    </Forms.FormText>
                )}
            </div>
        </ErrorBoundary>
    );
}
