/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    type CustomCommandDefinition,
    getCategoryPath,
    listCategories
} from "../../registry";
import type { CategoryOption } from "./types";

export const ACTION_OPTIONS = [
    { label: "Alias", value: "command" },
    { label: "Quicklink", value: "url" },
    { label: "Sequence", value: "macro" }
] as const;

export type ActionType = typeof ACTION_OPTIONS[number]["value"];

export function createDefaultCommand(): CustomCommandDefinition {
    const baseId = `custom-${Math.random().toString(36).slice(2, 8)}`;
    return {
        id: baseId,
        label: "New Command",
        keywords: [],
        categoryId: undefined,
        description: "",
        showConfirmation: false,
        iconId: "auto",
        action: {
            type: "command",
            commandId: ""
        }
    };
}

export function parseCommaListPreserve(value: string): string[] {
    return value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
}

export function hasAdvancedContent(command: CustomCommandDefinition): boolean {
    return Boolean(
        command.description?.trim().length
        || (command.keywords?.length ?? 0)
        || command.categoryId
        || command.showConfirmation
    );
}

export function buildCategoryOptions(): CategoryOption[] {
    const categories = listCategories();
    const options: CategoryOption[] = categories.map(category => {
        const path = getCategoryPath(category.id);
        const label = path.length ? path.map(item => item.label).join(" › ") : category.label;

        return {
            label: `${label} (${category.id})`,
            value: category.id,
            description: category.description
        };
    });

    return [
        { label: "Auto (use default placement)", value: "" },
        ...options
    ];
}
