/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Channel, Guild, User } from "@vencord/discord-types";

const userMentionRegex = /<@!?(\d{17,20})>/;
const userProfileUrlRegex = /discord(?:(?:app)?\.com|:\/\/-?)\/users\/(\d{17,20})/;
const userAvatarRegex = /cdn\.discordapp\.com\/(?:avatars|users)\/(\d{17,20})\//;
const guildUserAvatarRegex = /cdn\.discordapp\.com\/guilds\/\d{17,20}\/users\/(\d{17,20})\/avatars\//;
const channelMentionRegex = /<#(\d{17,20})>/;
const channelUrlRegex = /discord(?:(?:app)?\.com|:\/\/-?)\/channels\/(?:(@me)|(\d{17,20}))\/(\d{17,20})/;
const channelPathRegex = /\/channels\/(@me|\d{17,20})\/(\d{17,20})/;
const guildIconRegex = /cdn\.discordapp\.com\/icons\/(\d{17,20})\//;

export type DropEntity =
    | { kind: "user"; id: string; }
    | { kind: "channel"; id: string; guildId?: string; }
    | { kind: "guild"; id: string; };

export interface DragifyPayload {
    id?: string;
    userId?: string;
    channelId?: string;
    guildId?: string;
    type?: string;
    kind?: string;
    itemType?: string;
}

type StoreSet = {
    ChannelStore: { getChannel(id: string): Channel | null | undefined; };
    GuildStore: { getGuild(id: string): Guild | null | undefined; };
    UserStore: { getUser(id: string): User | null | undefined; };
};

export function tryParseJson<T = Record<string, unknown>>(value: string): T | null {
    if (!value || value.length < 2 || (value[0] !== "{" && value[0] !== "[")) return null;
    try {
        const parsed = JSON.parse(value);
        return typeof parsed === "object" && parsed ? parsed as T : null;
    } catch {
        return null;
    }
}

export function extractSnowflakeFromString(value: string): string | null {
    const match = value.match(/\d{17,20}/);
    return match?.[0] ?? null;
}

export function extractSnowflakes(values: string[]): string[] {
    const ids = new Set<string>();
    const regex = /\d{17,20}/g;
    for (const value of values) {
        const matches = value.match(regex);
        if (matches) matches.forEach(id => ids.add(id));
    }
    return Array.from(ids);
}

export function extractStrings(dataTransfer: DataTransfer): string[] {
    const collected = new Set<string>();
    const add = (v?: string) => v && collected.add(v);
    add(dataTransfer.getData("text/plain"));
    add(dataTransfer.getData("text/uri-list"));
    add(dataTransfer.getData("text/html"));
    add(dataTransfer.getData("text/x-moz-url"));
    add(dataTransfer.getData("application/json"));
    for (const type of dataTransfer.types ?? []) add(dataTransfer.getData(type));

    const split: string[] = [];
    for (const v of collected) {
        split.push(v);
        if (v.includes("\n")) split.push(...v.split(/\s+/).filter(Boolean));
    }
    return Array.from(new Set(split));
}

export async function collectPayloadStrings(dataTransfer: DataTransfer): Promise<string[]> {
    const sync = extractStrings(dataTransfer);
    const asyncValues: string[] = [];
    const itemPromises = Array.from(dataTransfer.items ?? [])
        .filter(item => item.kind === "string")
        .map(item => new Promise<void>(resolve => item.getAsString(val => {
            if (val) asyncValues.push(val);
            resolve();
        })));
    await Promise.all(itemPromises);
    return Array.from(new Set([...sync, ...asyncValues]));
}

export function serializeDragEntity(entity: DropEntity) {
    return JSON.stringify(entity);
}

export function parseDragifyPayload(value: string): DropEntity | null {
    const parsed = tryParseJson<DragifyPayload>(value);
    if (!parsed?.kind || !parsed.id) return null;

    switch (parsed.kind) {
        case "user":
            return { kind: "user", id: parsed.id };
        case "channel":
            return { kind: "channel", id: parsed.id, guildId: parsed.guildId };
        case "guild":
            return { kind: "guild", id: parsed.id };
        default:
            return null;
    }
}

function parseJsonPayload(payload: DragifyPayload): DropEntity | null {
    const id = payload.id ?? payload.userId ?? payload.channelId ?? payload.guildId;
    if (!id) return null;

    const type = (payload.type ?? payload.kind ?? payload.itemType ?? "").toLowerCase();
    if (type.includes("user")) return { kind: "user", id };
    if (type.includes("channel")) return { kind: "channel", id, guildId: payload.guildId };
    if (type.includes("guild") || type.includes("server")) return { kind: "guild", id };
    return null;
}

function parseUserString(value: string): DropEntity | null {
    const userFromMention = userMentionRegex.exec(value);
    if (userFromMention) return { kind: "user", id: userFromMention[1] };

    const userFromProfile = userProfileUrlRegex.exec(value);
    if (userFromProfile) return { kind: "user", id: userFromProfile[1] };

    const guildUserAvatar = guildUserAvatarRegex.exec(value);
    if (guildUserAvatar) return { kind: "user", id: guildUserAvatar[1] };

    const userFromAvatar = userAvatarRegex.exec(value);
    return userFromAvatar ? { kind: "user", id: userFromAvatar[1] } : null;
}

function parseChannelString(value: string): DropEntity | null {
    const channelFromMention = channelMentionRegex.exec(value);
    if (channelFromMention) return { kind: "channel", id: channelFromMention[1] };

    const channelFromUrl = channelUrlRegex.exec(value);
    if (!channelFromUrl) return null;

    const guildId = channelFromUrl[1] === "@me" ? "@me" : channelFromUrl[2];
    return { kind: "channel", id: channelFromUrl[3], guildId: guildId ?? undefined };
}

function parseGuildString(value: string): DropEntity | null {
    const guildFromIcon = guildIconRegex.exec(value);
    return guildFromIcon ? { kind: "guild", id: guildFromIcon[1] } : null;
}

export function parseFromStrings(payloads: string[], stores: StoreSet): DropEntity | null {
    if (payloads.length === 0) return null;

    const values = payloads
        .map(value => value.trim())
        .filter(Boolean);

    for (const value of values) {
        const parsed = tryParseJson<DragifyPayload>(value);
        if (!parsed) continue;

        const jsonEntity = parseJsonPayload(parsed);
        if (jsonEntity) return jsonEntity;
    }

    for (const value of values) {
        const userEntity = parseUserString(value);
        if (userEntity) return userEntity;
    }

    for (const value of values) {
        const channelEntity = parseChannelString(value);
        if (channelEntity) return channelEntity;
    }

    for (const value of values) {
        const guildEntity = parseGuildString(value);
        if (guildEntity) return guildEntity;
    }

    const candidates = extractSnowflakes(values);
    for (const candidate of candidates) {
        if (stores.ChannelStore.getChannel(candidate)) return { kind: "channel", id: candidate };
        if (stores.GuildStore.getGuild(candidate)) return { kind: "guild", id: candidate };
        if (stores.UserStore.getUser(candidate)) return { kind: "user", id: candidate };
    }
    return null;
}

export function extractChannelPath(value: string): { guildId?: string; channelId?: string; } | null {
    const channelPath = channelPathRegex.exec(value);
    if (!channelPath) return null;
    return {
        guildId: channelPath[1] === "@me" ? "@me" : channelPath[1],
        channelId: channelPath[2]
    };
}

export function extractChannelFromUrl(value: string): { guildId?: string; channelId?: string; } | null {
    const channelFromUrl = channelUrlRegex.exec(value);
    if (!channelFromUrl) return null;
    const guildId = channelFromUrl[1] ?? channelFromUrl[2];
    return {
        guildId: guildId === "@me" ? "@me" : guildId,
        channelId: channelFromUrl[3]
    };
}

export function extractUserFromAvatar(value: string): string | null {
    const guildUserAvatar = guildUserAvatarRegex.exec(value);
    if (guildUserAvatar?.[1]) return guildUserAvatar[1];
    const userAvatar = userAvatarRegex.exec(value);
    if (userAvatar?.[1]) return userAvatar[1];
    return null;
}

export function extractUserFromProfile(value: string): string | null {
    const match = userProfileUrlRegex.exec(value);
    return match?.[1] ?? null;
}
