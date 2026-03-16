/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type CustomCommandDefinition, getCommandById, getSettingsCommandMetaByRoute } from "../../registry";
import type { ValidationIssue } from "./types";

export function validateCustomCommand(command: CustomCommandDefinition): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!command.label.trim()) {
        issues.push({ field: "label", message: "Enter a command name.", severity: "error" });
    }

    switch (command.action.type) {
        case "command": {
            const targetId = command.action.commandId.trim();
            if (!targetId) {
                issues.push({ field: "action.commandId", message: "Pick a command to run.", severity: "error" });
                break;
            }

            if (!getCommandById(targetId)) {
                issues.push({ field: "action.commandId", message: "That command does not exist in the palette.", severity: "error" });
            }
            break;
        }
        case "settings": {
            const route = command.action.route.trim();
            if (!route) {
                issues.push({ field: "action.route", message: "Pick a settings page.", severity: "error" });
                break;
            }

            if (!getSettingsCommandMetaByRoute(route)) {
                issues.push({ field: "action.route", message: "That settings page is not available right now.", severity: "warning" });
            }
            break;
        }
        case "url": {
            const url = command.action.url.trim();
            if (!url) {
                issues.push({ field: "action.url", message: "Enter a URL.", severity: "error" });
                break;
            }

            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                issues.push({ field: "action.url", message: "Use a URL that starts with http:// or https://.", severity: "error" });
                break;
            }

            try {
                new URL(url);
            } catch {
                issues.push({ field: "action.url", message: "Enter a valid URL.", severity: "error" });
            }
            break;
        }
        case "macro": {
            const { steps } = command.action;
            if (!steps.length) {
                issues.push({ field: "action.steps", message: "Add at least one macro step.", severity: "error" });
                break;
            }

            const missing = steps.filter(step => !getCommandById(step));
            if (missing.length) {
                issues.push({
                    field: "action.steps",
                    message: `Some macro steps do not exist: ${missing.join(", ")}.`,
                    severity: "error"
                });
            }
            break;
        }
    }

    return issues;
}

export function hasStepBlockingError(command: CustomCommandDefinition, step: 0 | 1 | 2): boolean {
    const issues = validateCustomCommand(command).filter(issue => issue.severity === "error");
    if (!issues.length) return false;

    if (step === 0) {
        return issues.some(issue => issue.field === "label");
    }

    if (step === 1) {
        return issues.some(issue => issue.field.startsWith("action."));
    }

    return issues.length > 0;
}

export function summarizeCommandAction(command: CustomCommandDefinition): string {
    switch (command.action.type) {
        case "command": {
            const target = command.action.commandId.trim();
            if (!target) return "Runs another palette command.";
            const entry = getCommandById(target);
            return entry
                ? `Runs “${entry.label}” (${entry.id}).`
                : `Runs command ID “${target}”.`;
        }
        case "settings":
            return `Opens Discord settings page “${command.action.route || "(not set)"}”.`;
        case "url":
            return `Opens URL “${command.action.url || "(not set)"}” ${command.action.openExternal ? "externally" : "inside Discord when possible"}.`;
        case "macro": {
            if (!command.action.steps.length) return "Runs a macro with no configured steps.";
            const stepSummary = command.action.steps.map((step, index) => {
                const entry = getCommandById(step);
                return `${index + 1}. ${entry?.label ?? "Unknown command"} (${step})`;
            }).join(" ");
            return `Runs macro steps: ${stepSummary}`;
        }
        default:
            return "Runs a custom command action.";
    }
}
