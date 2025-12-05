/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";

export interface ScheduledReaction {
    emoji: {
        id: string | null;
        name: string;
        animated?: boolean;
    };
    count: number;
}

export interface ScheduledAttachment {
    filename: string;
    data: string;
    type: string;
}

export interface ScheduledMessage {
    id: string;
    channelId: string;
    content: string;
    scheduledTime: number;
    createdAt: number;
    reactions?: ScheduledReaction[];
    attachments?: ScheduledAttachment[];
}

export interface PhantomMessageData {
    scheduledTime: number;
    messageId: string;
    channelId: string;
}

export interface FluxReactionEvent {
    type: string;
    messageId?: string;
    channelId?: string;
    emoji?: {
        id: string | null;
        name: string;
        animated?: boolean;
    };
    optimistic?: boolean;
}

export interface ExtendedMessage extends Message {
    scheduledMessageData?: {
        scheduledTime: number;
        messageId: string;
    };
}
