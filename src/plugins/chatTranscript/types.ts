/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel, Message } from "@vencord/discord-types";

type ExportFormat = "html" | "markdown" | "json";

interface CollectMessagesOptions {
    limit: number;
    startTs: number | null;
    endTs: number | null;
    pivotId?: string;
    fromStart?: boolean;
    onProgress?: (count: number) => void;
}

interface FilterOptions {
    startTs: number | null;
    endTs: number | null;
    includeBots: boolean;
    includeSystem: boolean;
    onlyPinned: boolean;
    onlyWithMedia: boolean;
    authorIds: Set<string> | null;
    keyword: string;
    includeAttachments: boolean;
    includeEmbeds: boolean;
}

interface FormatOptions {
    format: ExportFormat;
    channel: Channel | undefined;
    includeAttachments: boolean;
    includeEmbeds: boolean;
    includeReactions: boolean;
    includeEdits: boolean;
    includeMentions: boolean;
    includeReferenced: boolean;
    groupByDay: boolean;
    fromStart: boolean;
}

interface TranscriptRequest {
    channelId: string;
    limit: number;
    startTs: number | null;
    endTs: number | null;
    fromStart: boolean;
    includeBots: boolean;
    includeSystem: boolean;
    onlyPinned: boolean;
    onlyWithMedia: boolean;
    authorIds: Set<string> | null;
    keyword: string;
    includeAttachments: boolean;
    includeEmbeds: boolean;
    includeReactions: boolean;
    includeEdits: boolean;
    includeMentions: boolean;
    includeReferenced: boolean;
    groupByDay: boolean;
    format: ExportFormat;
    pivotMessage?: Message;
    includePivot: boolean;
}

export type {
    CollectMessagesOptions,
    ExportFormat,
    FilterOptions,
    FormatOptions,
    TranscriptRequest
};

