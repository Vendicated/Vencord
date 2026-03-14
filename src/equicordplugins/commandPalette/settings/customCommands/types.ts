/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CustomCommandDefinition } from "../../registry";

export type WizardStepId = "basics" | "action" | "review";

export interface ValidationIssue {
    field: string;
    message: string;
    severity: "error" | "warning";
}

export type CommandTemplateId = "command" | "settings" | "url" | "macro";

export interface CategoryOption {
    label: string;
    value: string;
    description?: string;
}

export interface CustomCommandDraftState {
    draft: CustomCommandDefinition;
    wizardStep: 0 | 1 | 2;
    showAdvanced: boolean;
    isCollapsed: boolean;
}
