/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/misc";
import { Tooltip, useEffect, useState } from "@webpack/common";

import { summarizeUrl } from "../api/summarize";
import { settings } from "../settings";
import { CheckmarkIcon, ClipboardIcon, SparklesIcon } from "./icons";

interface SummaryComponentProps {
    url: string;
}

export function SummaryComponent({ url }: SummaryComponentProps) {
    const [state, setState] = useState<"loading" | "completed" | "error">("loading");
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [generationTime, setGenerationTime] = useState<number>(0);
    const [modelUsed, setModelUsed] = useState<string>(settings.store.ollamaModel);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        async function fetchSummary() {
            setState("loading");
            const startTime = performance.now();

            const result = await summarizeUrl(url);
            const endTime = performance.now();
            setGenerationTime(endTime - startTime);
            setModelUsed(settings.store.ollamaModel);

            if (result) {
                setSummary(result);
                setState("completed");
            } else {
                setState("error");
                setError("Failed to generate summary");
            }
        }

        fetchSummary();
    }, [url]);

    const handleCopy = () => {
        if (!summary) return;
        copyWithToast(summary);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div>
            {state === "loading" && (
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--text-muted)"
                }}>
                    <SparklesIcon /> Generating summary...
                </div>
            )}
            {state === "completed" && summary && (
                <div>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px"
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "var(--text-muted)",
                            fontSize: "0.9em"
                        }}>
                            <SparklesIcon /> AI Summary
                        </div>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px"
                        }}>
                            <div style={{
                                fontSize: "0.8em",
                                color: "var(--text-muted)",
                                display: "flex",
                                gap: "8px"
                            }}>
                                <span>{modelUsed}</span>
                                <span>•</span>
                                <span>{(generationTime / 1000).toFixed(2)}s</span>
                            </div>
                            <Tooltip text={isCopied ? "Copied!" : "Copy to clipboard"}>
                                {tooltipProps => (
                                    <button
                                        {...tooltipProps}
                                        onClick={handleCopy}
                                        style={{
                                            padding: "6px",
                                            background: "var(--button-secondary-background)",
                                            border: "none",
                                            borderRadius: "4px",
                                            color: "var(--text-normal)",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "background 0.2s ease"
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = "var(--button-secondary-background-hover)";
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = "var(--button-secondary-background)";
                                        }}
                                    >
                                        {isCopied ? <CheckmarkIcon /> : <ClipboardIcon />}
                                    </button>
                                )}
                            </Tooltip>
                        </div>
                    </div>
                    <div style={{
                        color: "var(--text-normal)",
                        lineHeight: "1.4"
                    }}>
                        {summary}
                    </div>
                </div>
            )}
            {state === "error" && (
                <div style={{
                    color: "var(--text-danger)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                }}>
                    Error: {error}
                </div>
            )}
        </div>
    );
}
