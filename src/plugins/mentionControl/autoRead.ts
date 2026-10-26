/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageType } from "@vencord/discord-types/enums";

import { isSnowflake } from "./preferences";

export interface AutoReadContext {
    accountId: string;
    channelId: string;
    scope: "guild" | "dm";
    guildId: string | undefined;
    lastMessageId: string | undefined;
    ackMessageId: string | null;
}

export interface AutoReadDependencies {
    context(message: unknown): AutoReadContext | undefined;
    defer(callback: () => void): void;
    ack(channelId: string, messageId: string): Promise<void>;
    now(): number;
    onError(): void;
}

interface Candidate {
    message: Record<string, unknown>;
    id: string;
    channelId: string;
    guildId: string | undefined;
    authorId: string;
    type: MessageType.DEFAULT | MessageType.REPLY;
}

const DISCORD_EPOCH = 1420070400000;
const MAX_RECENT_ATTEMPTS = 512;

function object(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function candidate(event: unknown): Candidate | undefined {
    if (!object(event) || event.type !== "MESSAGE_CREATE") return;
    for (const key of ["optimistic", "isPushNotification", "isReplay", "replayed"])
        if (event[key] !== undefined && event[key] !== false) return;
    const { message } = event;
    if (!object(message) || !isSnowflake(message.id) || !isSnowflake(message.channel_id)
        || event.channelId !== message.channel_id || !object(message.author) || !isSnowflake(message.author.id)
        || (message.guild_id != null && !isSnowflake(message.guild_id))
        || (message.type !== MessageType.DEFAULT && message.type !== MessageType.REPLY)
        || (message.state !== undefined && message.state !== "SENT")
        || message.edited_timestamp != null || message.editedTimestamp != null) return;
    return { message, id: message.id, channelId: message.channel_id, guildId: message.guild_id ?? undefined, authorId: message.author.id, type: message.type };
}

function eligible(value: AutoReadContext | undefined, target: Candidate): value is AutoReadContext {
    return Boolean(value && isSnowflake(value.accountId) && value.accountId !== target.authorId
        && isSnowflake(value.channelId) && value.channelId === target.channelId
        && ((value.scope === "guild" && isSnowflake(value.guildId) && (target.guildId === undefined || target.guildId === value.guildId))
            || (value.scope === "dm" && value.guildId === undefined && target.guildId === undefined))
        && value.lastMessageId === target.id
        && (value.ackMessageId === null || (isSnowflake(value.ackMessageId) && BigInt(value.ackMessageId) < BigInt(target.id))));
}

export class AutoReadController {
    private generation = 0;
    private activatedAt: number | undefined;
    private attempted = new Set<string>();

    constructor(private dependencies: AutoReadDependencies) {
        this.reset();
    }

    reset(): void {
        this.generation++;
        this.attempted.clear();
        this.activatedAt = undefined;
        try {
            const now = this.dependencies.now();
            if (!Number.isSafeInteger(now) || now < DISCORD_EPOCH) throw new Error("Invalid activation clock.");
            this.activatedAt = now;
        } catch {
            this.reportError();
        }
    }

    handle(event: unknown): void {
        try {
            const target = candidate(event);
            if (!target || this.activatedAt === undefined) return;
            const createdAt = Number(BigInt(target.id) >> 22n) + DISCORD_EPOCH;
            const now = this.dependencies.now();
            if (!Number.isSafeInteger(now) || createdAt <= this.activatedAt || createdAt > now) return;
            const initial = this.dependencies.context(target.message);
            if (!eligible(initial, target)) return;
            const { accountId, scope, guildId } = initial;
            const key = `${accountId}:${target.channelId}:${target.id}`;
            if (this.attempted.has(key)) return;
            this.attempted.add(key);
            if (this.attempted.size > MAX_RECENT_ATTEMPTS) this.attempted.delete(this.attempted.values().next().value!);
            const { generation } = this;
            this.dependencies.defer(() => {
                try {
                    if (generation !== this.generation) return;
                    const latestTarget = candidate(event);
                    if (!latestTarget || latestTarget.id !== target.id || latestTarget.channelId !== target.channelId
                        || latestTarget.guildId !== target.guildId || latestTarget.authorId !== target.authorId || latestTarget.type !== target.type) return;
                    const latest = this.dependencies.context(latestTarget.message);
                    if (!eligible(latest, latestTarget) || latest.accountId !== accountId || latest.scope !== scope || latest.guildId !== guildId) return;
                    // This promise reports native dispatch completion, never HTTP success. Do not retry.
                    void this.dependencies.ack(target.channelId, target.id).catch(() => this.reportError());
                } catch {
                    this.reportError();
                }
            });
        } catch {
            this.reportError();
        }
    }

    private reportError(): void {
        try {
            this.dependencies.onError();
        } catch {
            // A failed status observer must not escape into the native message dispatcher.
        }
    }
}
