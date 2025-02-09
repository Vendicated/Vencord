/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from "@webpack/common";
import { Message } from "discord-types/general";

import { AnalyzeIcon } from "./AnalyzeIcon";
import { AnalysisValue, cl } from "./utils";

const AnalysisSetters = new Map<string, (v: AnalysisValue | null) => void>();

export function handleAnalysis(messageId: string, data: AnalysisValue) {
    const setter = AnalysisSetters.get(messageId);
    if (setter) {
        setter(data);
    }
}

export function AnalysisAccessory({ message }: { message: Message; }) {
    const [analysis, setAnalysis] = useState<AnalysisValue | null>(null);

    useEffect(() => {
        AnalysisSetters.set(message.id, setAnalysis);
        return () => void AnalysisSetters.delete(message.id);
    }, [message.id]);

    const getColorClass = (type: AnalysisValue["details"][number]["type"]) => {
        switch(type) {
            case "safe": return cl("safe");
            case "suspicious": return cl("suspicious");
            case "malicious": return cl("malicious");
            default: return cl("neutral");
        }
    };

    if (!analysis) return null;

    return (
        <div className={cl("accessory")}>
            <AnalyzeIcon width={16} height={16} className={cl("icon")} />
            <div className={cl("results")}>
                <strong className={cl("title")}>Security Analysis:</strong>
                {analysis.details.map((detail, i) => (
                    <div key={i} className={`${cl("detail")} ${getColorClass(detail.type)}`}>
                        {detail.message}
                    </div>
                ))}
                <button
                    onClick={() => setAnalysis(null)}
                    className={cl("dismiss")}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
