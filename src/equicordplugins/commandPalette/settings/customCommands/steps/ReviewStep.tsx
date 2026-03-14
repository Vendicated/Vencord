/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";

import { type CustomCommandDefinition, getCommandById, getSettingsCommandMetaByRoute } from "../../../registry";
import type { ValidationIssue } from "../types";
import { summarizeCommandAction } from "../validation";

interface ReviewStepProps {
    command: CustomCommandDefinition;
    issues: ValidationIssue[];
}

export function ReviewStep({ command, issues }: ReviewStepProps) {
    const description = command.description?.trim();
    const keywords = command.keywords?.filter(Boolean) ?? [];
    const actionDetails: string[] = [];

    if (command.action.type === "command") {
        const targetId = command.action.commandId.trim();
        const target = targetId ? getCommandById(targetId) : null;
        actionDetails.push(`Target command: ${target?.label ?? "Unknown"} (${targetId || "not set"})`);
    } else if (command.action.type === "settings") {
        const route = command.action.route.trim();
        const target = route ? getSettingsCommandMetaByRoute(route) : undefined;
        actionDetails.push(`Settings page: ${(target?.label ?? route) || "not set"}`);
    } else if (command.action.type === "url") {
        actionDetails.push(`URL: ${command.action.url.trim() || "not set"}`);
        actionDetails.push(`Open mode: ${command.action.openExternal ? "External browser" : "Discord when possible"}`);
    } else if (command.action.type === "macro") {
        actionDetails.push(`Macro steps: ${command.action.steps.length}`);
        for (const [index, step] of command.action.steps.entries()) {
            const target = getCommandById(step);
            actionDetails.push(`${index + 1}. ${target?.label ?? "Unknown command"} (${step})`);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Paragraph size="sm" style={{ color: "var(--text-normal, #dcddde)" }}>
                {`When run, this command ${summarizeCommandAction(command).toLowerCase()}`}
            </Paragraph>
            {description && (
                <Paragraph size="sm" style={{ color: "var(--text-muted, #a5a6ab)" }}>
                    Description: {description}
                </Paragraph>
            )}
            {keywords.length > 0 && (
                <Paragraph size="sm" style={{ color: "var(--text-muted, #a5a6ab)" }}>
                    Keywords: {keywords.join(", ")}
                </Paragraph>
            )}
            {actionDetails.map((line, index) => (
                <Paragraph key={`${line}-${index}`} size="sm" style={{ color: "var(--text-muted, #a5a6ab)" }}>
                    {line}
                </Paragraph>
            ))}
            {command.showConfirmation && (
                <Paragraph size="sm" style={{ color: "var(--text-normal, #dcddde)" }}>
                    Confirmation required before running.
                </Paragraph>
            )}
            {issues.length === 0 && (
                <Paragraph size="sm" style={{ color: "var(--text-muted, #a5a6ab)" }}>
                    Looks good. This command is ready to save.
                </Paragraph>
            )}
            {issues.map((issue, index) => (
                <Paragraph
                    key={`${issue.field}-${index}`}
                    size="sm"
                    style={{ color: issue.severity === "error" ? "var(--status-danger-text, #f04747)" : "var(--text-muted, #a5a6ab)" }}
                >
                    {issue.message}
                </Paragraph>
            ))}
        </div>
    );
}
