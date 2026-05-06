/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type SearchTab = "messages" | "media" | "links" | "files" | "pins";

export type TabKey = "all" | SearchTab;

export type HasFilter = "image" | "video" | "file" | "audio" | "link" | "embed" | "sound" | "snapshot" | "sticker";

export interface SearchCursor {
    timestamp: string;
    type: "timestamp";
}

export interface TabRequest {
    sort_by: "timestamp" | "relevance";
    sort_order: "asc" | "desc";
    content?: string;
    cursor?: SearchCursor | null;
    limit: number;
    has?: HasFilter[];
    pinned?: boolean;
}

export interface SearchTabsBody {
    tabs: Partial<Record<SearchTab, TabRequest>>;
    track_exact_total_hits: boolean;
}

interface RawTabResponse {
    messages?: unknown[][];
    cursor?: SearchCursor | null;
    total_results?: number;
    analytics_id?: string;
    channels?: ChannelMeta[];
}

export interface SearchTabsResponse {
    tabs: Partial<Record<SearchTab, RawTabResponse>>;
}

interface MessageAttachment {
    id: string;
    filename: string;
    content_type?: string;
    url: string;
    proxy_url: string;
    size: number;
    width?: number;
    height?: number;
}

export interface MessageHit {
    id: string;
    content: string;
    channel_id: string;
    author: {
        id: string;
        username?: string;
        global_name?: string | null;
        avatar?: string | null;
        bot?: boolean;
    };
    timestamp: string;
    attachments?: MessageAttachment[];
    embeds?: unknown[];
    pinned?: boolean;
    flags?: number;
}

export interface ChannelMeta {
    id: string;
    type: number;
    name?: string;
    recipients?: {
        id: string;
        username?: string;
        global_name?: string | null;
        avatar?: string | null;
    }[];
    guild_id?: string;
    icon?: string | null;
}

export interface TabResult {
    hits: MessageHit[];
    cursor: SearchCursor | null;
    total_results: number;
}

export type TabResults = Record<SearchTab, TabResult> & {
    channels: Map<string, ChannelMeta>;
};

export interface Bag {
    hits: Record<SearchTab, MessageHit[]>;
    cursors: Record<SearchTab, SearchCursor | null>;
    totals: Record<SearchTab, number>;
    channels: Map<string, ChannelMeta>;
}

export interface ChannelInfo {
    kind: "dm" | "group" | "server" | "unknown";
    target: string;
    server?: string;
}
