/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import type { Plugin } from "@utils/types";
import { ChannelStore, GuildChannelStore, GuildStore, IconUtils, RelationshipStore, SelectedGuildStore, UserStore } from "@webpack/common";

import { getCommandById, getSettingsCommandMetaByRoute } from "../registry";
import type { ResolvedChannel, ResolvedGuild, ResolvedUser } from "./types";

function toMentionId(target: string): string | null {
    const mention = target.match(/^<@!?(\d{16,20})>$/);
    if (mention?.[1]) return mention[1];

    const plain = target.match(/^@?(\d{16,20})$/);
    if (plain?.[1]) return plain[1];

    return null;
}

function normalizeText(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeSearchableText(value: string): string {
    return normalizeText(value)
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function scoreTargetMatch(target: string, candidate: string): number {
    if (!target || !candidate) return 0;
    if (candidate === target) return 240;
    if (candidate.startsWith(target)) return 170;
    if (candidate.includes(target)) return 110;
    return 0;
}

function scoreSearchMatch(target: string, candidate: string): number {
    const normalizedTarget = normalizeText(target);
    const normalizedCandidate = normalizeText(candidate);
    const base = scoreTargetMatch(normalizedTarget, normalizedCandidate);

    const searchableTarget = normalizeSearchableText(target);
    const searchableCandidate = normalizeSearchableText(candidate);
    const searchableScore = scoreTargetMatch(searchableTarget, searchableCandidate);

    return Math.max(base, searchableScore);
}

export function resolveUsers(target: string): ResolvedUser[] {
    const normalizedTarget = normalizeText(target);
    if (!normalizedTarget) return [];
    const currentUserId = UserStore.getCurrentUser?.()?.id;

    const mentionId = toMentionId(target);
    if (mentionId) {
        if (currentUserId && mentionId === currentUserId) return [];
        const user = UserStore.getUser(mentionId);
        if (!user) return [];
        return [{
            user,
            display: user.globalName ?? user.username,
            iconUrl: IconUtils.getUserAvatarURL(user)
        }];
    }

    const friendIds = RelationshipStore.getFriendIDs?.() ?? [];
    const seen = new Set<string>();
    const matches: Array<{ entry: ResolvedUser; score: number; }> = [];

    for (const id of friendIds) {
        if (seen.has(id)) continue;
        if (currentUserId && id === currentUserId) continue;
        seen.add(id);

        const user = UserStore.getUser(id);
        if (!user) continue;

        const nickname = RelationshipStore.getNickname?.(id) ?? "";
        const display = nickname || user.globalName || user.username;

        const candidates = [
            user.username,
            user.globalName ?? "",
            user.tag,
            nickname
        ].filter(Boolean).map(normalizeText);

        const score = Math.max(...candidates.map(candidate => scoreTargetMatch(normalizedTarget, candidate)), 0);
        if (score <= 0) continue;

        matches.push({
            entry: {
                user,
                display,
                iconUrl: IconUtils.getUserAvatarURL(user)
            },
            score
        });
    }

    return matches
        .sort((a, b) => b.score - a.score || a.entry.display.localeCompare(b.entry.display))
        .map(item => item.entry);
}

interface ChannelStoreWithPrivateChannels {
    getSortedPrivateChannels?(): Array<string | { id?: string; channelId?: string; recipients?: string[]; }>;
    getMutableGuildChannelsForGuild?(guildId: string): Record<string, { channel?: { id: string; name?: string; guild_id?: string; }; }>;
    getMutablePrivateChannels?(): Record<string, PickerChannelLike | PickerChannelWrapper>;
}

const channelStoreWithPrivateChannels = ChannelStore as ChannelStoreWithPrivateChannels;

export function resolveRecentDmUsers(limit = 10): ResolvedUser[] {
    const channels = channelStoreWithPrivateChannels.getSortedPrivateChannels?.() ?? [];

    const seenUsers = new Set<string>();
    const results: ResolvedUser[] = [];
    const currentUserId = UserStore.getCurrentUser?.()?.id;

    for (const raw of channels) {
        const channelId = typeof raw === "string"
            ? raw
            : raw?.id ?? raw?.channelId ?? null;
        if (!channelId) continue;

        const channel = ChannelStore.getChannel(channelId);
        if (!channel || !(channel.isDM?.() ?? false)) continue;

        const recipientId = channel.recipients?.[0];
        if (!recipientId || seenUsers.has(recipientId)) continue;
        if (currentUserId && recipientId === currentUserId) continue;

        const user = UserStore.getUser(recipientId);
        if (!user) continue;

        seenUsers.add(recipientId);
        const display = RelationshipStore.getNickname?.(recipientId) || user.globalName || user.username;

        results.push({
            user,
            display,
            iconUrl: IconUtils.getUserAvatarURL(user)
        });

        if (results.length >= limit) break;
    }

    return results;
}

export function resolveGuildIds(target: string, options?: { includeAllWhenEmpty?: boolean; }): string[] {
    const normalizedTarget = normalizeText(target);
    const includeAllWhenEmpty = options?.includeAllWhenEmpty ?? false;
    if (!normalizedTarget && !includeAllWhenEmpty) return [];

    const guildById = GuildStore.getGuild?.(target);
    if (guildById) return [guildById.id];

    const guilds = Object.values(GuildStore.getGuilds?.() ?? {});
    if (!normalizedTarget && includeAllWhenEmpty) {
        return guilds
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(guild => guild.id);
    }

    const scored = guilds
        .map(guild => {
            const score = scoreTargetMatch(normalizedTarget, normalizeText(guild.name));
            return { guild, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.guild.name.localeCompare(b.guild.name));

    return scored.map(item => item.guild.id);
}

export function resolveGuilds(target: string, options?: { includeAllWhenEmpty?: boolean; }): ResolvedGuild[] {
    const ids = resolveGuildIds(target, options);
    const results: ResolvedGuild[] = [];

    for (const id of ids) {
        const guild = GuildStore.getGuild?.(id);
        if (!guild) continue;

        results.push({
            id: guild.id,
            display: guild.name,
            iconUrl: IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64 }) ?? undefined
        });
    }

    return results;
}

export function resolveChannelIds(target: string): string[] {
    const normalizedTarget = normalizeText(target);
    if (!normalizedTarget) return [];

    const mention = target.match(/^<#(\d{16,20})>$/);
    if (mention?.[1]) return [mention[1]];

    const asId = target.match(/^(\d{16,20})$/)?.[1];
    if (asId) {
        const channel = ChannelStore.getChannel(asId);
        return channel ? [channel.id] : [];
    }

    const selectedGuildId = SelectedGuildStore.getGuildId?.();
    if (!selectedGuildId || selectedGuildId === "@me") return [];

    const grouped = channelStoreWithPrivateChannels.getMutableGuildChannelsForGuild?.(selectedGuildId);
    if (!grouped) return [];

    const scored: Array<{ id: string; score: number; }> = [];

    for (const value of Object.values(grouped)) {
        const { channel } = value;
        if (!channel?.id || !channel.name) continue;
        const score = scoreTargetMatch(normalizedTarget, normalizeText(channel.name));
        if (score <= 0) continue;
        scored.push({ id: channel.id, score });
    }

    return scored.sort((a, b) => b.score - a.score).map(item => item.id);
}

export function resolveChannels(target: string): ResolvedChannel[] {
    const ids = resolveChannelIds(target);
    return ids.map(id => {
        const channel = ChannelStore.getChannel(id);
        const isGroupDm = channel && typeof channel.isGroupDM === "function" ? channel.isGroupDM() : false;
        const isDm = channel && typeof channel.isDM === "function" ? channel.isDM() : false;

        const name = isGroupDm
            ? (channel?.name ?? "Group DM")
            : channel?.name
                ? `#${channel.name}`
                : `Channel ${id}`;

        let iconUrl: string | undefined;

        if (isGroupDm && channel) {
            iconUrl = IconUtils.getChannelIconURL(channel) ?? undefined;
        } else if (isDm && channel?.recipients?.length) {
            const recipient = UserStore.getUser(channel.recipients[0]);
            if (recipient) iconUrl = IconUtils.getUserAvatarURL(recipient);
        } else if (channel?.guild_id) {
            const guild = GuildStore.getGuild?.(channel.guild_id);
            if (guild) {
                iconUrl = IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64 }) ?? undefined;
            }
        }

        return { id, display: name, iconUrl };
    });
}

interface PrivateChannelCandidate {
    id: string;
    display: string;
    iconUrl?: string;
    score: number;
}

interface PickerChannelLike {
    id: string;
    name?: string;
    guild_id?: string | null;
    recipients?: string[];
    type?: number;
    isDM?(): boolean;
    isGroupDM?(): boolean;
}

interface PickerChannelWrapper {
    channel?: PickerChannelLike;
}

function isPickerChannelLike(value: unknown): value is PickerChannelLike {
    return Boolean(
        value
        && typeof value === "object"
        && typeof (value as { id?: unknown; }).id === "string"
    );
}

function resolveChannelIdEntry(raw: string | { id?: string; channelId?: string; } | null | undefined): string | null {
    if (!raw) return null;
    if (typeof raw === "string") return raw;
    return raw.id ?? raw.channelId ?? null;
}

function getPrivateChannelIds(): string[] {
    const ids: string[] = [];
    const seen = new Set<string>();
    const sorted = channelStoreWithPrivateChannels.getSortedPrivateChannels?.() ?? [];
    for (const raw of sorted) {
        const channelId = resolveChannelIdEntry(raw);
        if (!channelId || seen.has(channelId)) continue;
        seen.add(channelId);
        ids.push(channelId);
    }

    const mutable = channelStoreWithPrivateChannels.getMutablePrivateChannels?.() ?? {};
    for (const value of Object.values(mutable)) {
        const channel = "channel" in value ? value.channel : value;
        if (!isPickerChannelLike(channel)) continue;
        const channelId = channel?.id;
        if (!channelId || seen.has(channelId)) continue;
        seen.add(channelId);
        ids.push(channelId);
    }

    return ids;
}

function getGuildChannelsForPicker(guildId: string): PickerChannelLike[] {
    const channels: PickerChannelLike[] = [];
    const seen = new Set<string>();
    const grouped = channelStoreWithPrivateChannels.getMutableGuildChannelsForGuild?.(guildId) ?? {};

    for (const value of Object.values(grouped)) {
        const channel = "channel" in value ? value.channel : value;
        if (!isPickerChannelLike(channel)) continue;
        if (!channel?.id || seen.has(channel.id)) continue;
        seen.add(channel.id);
        channels.push(channel);
    }

    const guildChannelCollection = GuildChannelStore.getChannels?.(guildId) ?? {};
    for (const value of Object.values(guildChannelCollection)) {
        if (!Array.isArray(value)) continue;
        for (const entry of value) {
            if (typeof entry !== "object" || !entry) continue;
            const candidate = "channel" in entry && typeof entry.channel === "object" && entry.channel
                ? entry.channel as PickerChannelLike
                : entry as PickerChannelLike;
            if (!candidate.id || seen.has(candidate.id)) continue;
            seen.add(candidate.id);
            channels.push(candidate);
        }
    }

    return channels;
}

function resolvePrivateChannels(target: string, includeAllWhenEmpty = false): ResolvedChannel[] {
    const normalizedTarget = normalizeText(target);
    if (!normalizedTarget && !includeAllWhenEmpty) return [];

    const candidates: PrivateChannelCandidate[] = [];
    const channelIds = getPrivateChannelIds();

    for (const channelId of channelIds) {
        if (!channelId) continue;

        const channel = ChannelStore.getChannel(channelId);
        if (!channel) continue;

        const isDm = typeof channel.isDM === "function" ? channel.isDM() : channel.type === 1;
        const isGroupDm = typeof channel.isGroupDM === "function" ? channel.isGroupDM() : channel.type === 3;
        if (!isDm && !isGroupDm) continue;

        if (isDm) {
            const recipientId = channel.recipients?.[0];
            if (!recipientId) continue;
            const user = UserStore.getUser(recipientId);
            if (!user) continue;

            const nickname = RelationshipStore.getNickname?.(recipientId) ?? "";
            const display = nickname || user.globalName || user.username;
            const score = Math.max(
                scoreSearchMatch(normalizedTarget, display),
                scoreSearchMatch(normalizedTarget, user.username),
                scoreSearchMatch(normalizedTarget, user.globalName ?? ""),
                scoreSearchMatch(normalizedTarget, user.tag),
                scoreSearchMatch(normalizedTarget, nickname)
            );
            if (score <= 0 && !includeAllWhenEmpty) continue;

            candidates.push({
                id: channelId,
                display: `@${display}`,
                iconUrl: IconUtils.getUserAvatarURL(user),
                score: score > 0 ? score : 1
            });
            continue;
        }

        const display = channel.name || "Group DM";
        const score = scoreSearchMatch(normalizedTarget, display);
        if (score <= 0 && !includeAllWhenEmpty) continue;

        candidates.push({
            id: channelId,
            display,
            iconUrl: IconUtils.getChannelIconURL(channel) ?? undefined,
            score: score > 0 ? score : 1
        });
    }

    return candidates
        .sort((left, right) => right.score - left.score || left.display.localeCompare(right.display))
        .map(candidate => ({
            id: candidate.id,
            display: candidate.display,
            iconUrl: candidate.iconUrl
        }));
}

function resolveGuildChannelsForPicker(target: string, includeAllWhenEmpty = false): ResolvedChannel[] {
    const normalizedTarget = normalizeText(target);
    if (!normalizedTarget && !includeAllWhenEmpty) return [];
    const allGuilds = Object.values(GuildStore.getGuilds?.() ?? {});
    if (allGuilds.length === 0) {
        const selectedGuildId = SelectedGuildStore.getGuildId?.();
        if (!selectedGuildId || selectedGuildId === "@me") return [];
        const channels = getGuildChannelsForPicker(selectedGuildId);
        if (channels.length === 0) return [];

        const results: Array<{ entry: ResolvedChannel; score: number; }> = [];
        for (const channel of channels) {
            if (!channel?.id || !channel.name) continue;

            const score = scoreSearchMatch(normalizedTarget, channel.name);
            if (score <= 0 && !includeAllWhenEmpty) continue;

            const guild = channel.guild_id ? GuildStore.getGuild?.(channel.guild_id) : null;
            const iconUrl = guild
                ? IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64 }) ?? undefined
                : undefined;

            results.push({
                entry: {
                    id: channel.id,
                    display: `#${channel.name}`,
                    iconUrl
                },
                score: score > 0 ? score : 1
            });
        }

        return results
            .sort((left, right) => right.score - left.score || left.entry.display.localeCompare(right.entry.display))
            .map(result => result.entry);
    }

    const results: Array<{ entry: ResolvedChannel; score: number; }> = [];

    for (const guild of allGuilds) {
        const channels = getGuildChannelsForPicker(guild.id);
        if (channels.length === 0) continue;

        for (const channel of channels) {
            if (!channel?.id || !channel.name) continue;

            const score = scoreSearchMatch(normalizedTarget, channel.name);
            if (score <= 0 && !includeAllWhenEmpty) continue;

            const iconUrl = IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64 }) ?? undefined;
            results.push({
                entry: {
                    id: channel.id,
                    display: `#${channel.name}`,
                    iconUrl
                },
                score: score > 0 ? score : 1
            });
        }
    }

    return results
        .sort((left, right) => right.score - left.score || left.entry.display.localeCompare(right.entry.display))
        .map(result => result.entry);
}

export function resolveAllChannels(target: string, options?: { includeAllWhenEmpty?: boolean; limit?: number; }): ResolvedChannel[] {
    const includeAllWhenEmpty = options?.includeAllWhenEmpty ?? false;
    const limit = options?.limit ?? 20;
    const resolvedGuildChannels = resolveGuildChannelsForPicker(target, includeAllWhenEmpty);
    const resolvedPrivateChannels = resolvePrivateChannels(target, includeAllWhenEmpty);
    const merged = new Map<string, ResolvedChannel>();

    for (const channel of resolvedGuildChannels) {
        merged.set(channel.id, channel);
    }

    for (const channel of resolvedPrivateChannels) {
        if (!merged.has(channel.id)) {
            merged.set(channel.id, channel);
        }
    }

    return Array.from(merged.values()).slice(0, limit);
}

const SETTINGS_COMMANDS = [
    { id: "settings-account", aliases: ["my account", "account", "profile"] },
    { id: "settings-profiles", aliases: ["profiles", "avatar", "bio"] },
    { id: "settings-privacy", aliases: ["data and privacy", "privacy", "privacy and safety"] },
    { id: "settings-notifications", aliases: ["notifications", "notifs"] },
    { id: "settings-voice", aliases: ["voice", "voice and video", "audio"] },
    { id: "settings-chat", aliases: ["chat", "messages"] },
    { id: "settings-text", aliases: ["text", "text and images", "images"] },
    { id: "settings-appearance", aliases: ["appearance", "theme"] },
    { id: "settings-accessibility", aliases: ["accessibility"] },
    { id: "settings-devices", aliases: ["devices", "sessions"] },
    { id: "settings-connections", aliases: ["connections", "accounts", "integrations"] },
    { id: "settings-authorized-apps", aliases: ["authorized apps", "oauth"] },
    { id: "settings-family-center", aliases: ["family center", "family"] },
    { id: "settings-keybinds", aliases: ["keybinds", "shortcuts"] },
    { id: "settings-advanced", aliases: ["advanced"] }
] as const;

export function resolveSettingsCommandIds(target: string): string[] {
    const normalizedTarget = normalizeText(target);
    if (!normalizedTarget) return [];

    const byRoute = getSettingsCommandMetaByRoute(normalizedTarget);
    if (byRoute) return [byRoute.id];

    const matches = SETTINGS_COMMANDS
        .map(item => {
            const score = Math.max(...item.aliases.map(alias => scoreTargetMatch(normalizedTarget, normalizeText(alias))), 0);
            return { id: item.id, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

    return matches
        .map(item => item.id)
        .filter(id => Boolean(getCommandById(id)));
}

export function resolvePlugins(target: string): Plugin[] {
    const normalizedTarget = normalizeText(target);
    if (!normalizedTarget) return [];

    const all = Object.values(plugins) as Plugin[];
    const scored = all
        .map(plugin => {
            const score = Math.max(
                scoreTargetMatch(normalizedTarget, normalizeText(plugin.name)),
                scoreTargetMatch(normalizedTarget, normalizeText(plugin.description ?? ""))
            );
            return { plugin, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.plugin.name.localeCompare(b.plugin.name));

    return scored.map(item => item.plugin);
}

export function pluginToggleVerb(plugin: Plugin): string {
    return isPluginEnabled(plugin.name) ? "Disable" : "Enable";
}
