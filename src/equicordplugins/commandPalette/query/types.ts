/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { User } from "@vencord/discord-types";

export type QueryIntent =
    | "send_message"
    | "send_channel"
    | "open_dm"
    | "go_to"
    | "open_settings"
    | "toggle_plugin"
    | "open_url"
    | "create_notebook"
    | "delete_notebook"
    | "move_note"
    | "jump_note"
    | "schedule_message"
    | "reschedule_message"
    | "send_scheduled_now"
    | "cancel_scheduled_message";

export interface ParsedQuery {
    raw: string;
    intent: QueryIntent;
    target: string;
    content?: string;
    useFilePicker?: boolean;
    silent?: boolean;
}

export interface ResolvedUser {
    user: User;
    display: string;
    iconUrl?: string;
}

export interface ResolvedGuild {
    id: string;
    display: string;
    iconUrl?: string;
}

export interface ResolvedChannel {
    id: string;
    display: string;
    iconUrl?: string;
}

export interface QueryActionCandidate {
    id: string;
    label: string;
    description?: string;
    inputPreview?: string;
    badge: string;
    shortcut?: string;
    icon?: React.ComponentType<{ className?: string; size?: string; }>;
    iconUrl?: string;
    suggestionKind?: "user" | "channel" | "guild" | "generic";
    run(): boolean | void | Promise<boolean | void>;
}

export type QueryResolution =
    | { type: "none"; }
    | { type: "invalid"; reason: string; }
    | { type: "candidates"; candidates: QueryActionCandidate[]; };
