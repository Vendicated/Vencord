/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { QueryActionCandidate } from "../query/types";
import type { CommandEntry } from "../registry";

export type CommandCandidate = {
    type: "command";
    id: string;
    command: CommandEntry;
    subtitle?: string;
    badge: string;
    pinned: boolean;
    shortcut?: string;
    icon?: React.ComponentType<{ className?: string; size?: string; }>;
};

export type QueryCandidate = {
    type: "query";
    id: string;
    query: QueryActionCandidate;
};

export type SectionCandidate = {
    type: "section";
    id: string;
    label: string;
};

export type PaletteCandidate = CommandCandidate | QueryCandidate | SectionCandidate;
