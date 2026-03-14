/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ReactNode } from "react";

export type PalettePageId = "send-dm" | "scheduled-create" | "status-timer" | (string & {});

export interface PalettePageRef {
    id: PalettePageId;
    initialData?: Record<string, string>;
}

export interface PaletteSuggestion {
    id: string;
    label: string;
    sublabel?: string;
    iconUrl?: string;
    icon?: React.ComponentType<{ className?: string; size?: string; }>;
    kind?: "user" | "channel" | "guild" | "generic";
}

export interface PaletteFieldSpec {
    key: string;
    label: string;
    type: "text" | "picker";
    placeholder?: string;
    suggestionLimit?: number;
}

export interface PalettePageValuesState {
    values: Record<string, string>;
    selectedIds: Record<string, string | null>;
}

export interface PalettePageRuntimeContext {
    values: Record<string, string>;
    selectedIds: Record<string, string | null>;
    setValue(fieldKey: string, value: string): void;
    setSelectedId(fieldKey: string, id: string | null): void;
    showSuccess(message: string): void;
    showFailure(message: string): void;
}

export interface PalettePageSpec {
    id: PalettePageId;
    title: string;
    submitLabel: string;
    fields: PaletteFieldSpec[];
    resolveSuggestions?(fieldKey: string, query: string, values: Record<string, string>, selectedIds: Record<string, string | null>): PaletteSuggestion[];
    validate?(context: PalettePageRuntimeContext): string | null;
    submit(context: PalettePageRuntimeContext): Promise<void>;
    renderPage?(context: PalettePageRuntimeContext): ReactNode;
    renderField?(field: PaletteFieldSpec, context: PalettePageRuntimeContext): ReactNode;
}
