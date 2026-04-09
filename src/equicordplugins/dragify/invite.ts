/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import type { Channel } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { ChannelStore, GuildChannelStore, GuildStore, PermissionsBits, PermissionStore, RestAPI, showToast, Toasts } from "@webpack/common";

const logger = new Logger("Dragify");

export type InviteSettings = {
    inviteExpireAfter?: number;
    inviteMaxUses?: number;
    inviteTemporaryMembership: boolean;
    reuseExistingInvites: boolean;
};

export type InviteCacheEntry = {
    code: string;
    expiresAt: number | null;
    maxUses: number | null;
    uses: number | null;
};

const inviteCache = new Map<string, InviteCacheEntry>();

export function clearInviteCache() {
    inviteCache.clear();
}

function normalizeInviteCacheEntry(invite: {
    code: string;
    expires_at?: string | null;
    max_uses?: number | null;
    uses?: number | null;
}): InviteCacheEntry {
    return {
        code: invite.code,
        expiresAt: invite.expires_at ? Date.parse(invite.expires_at) : null,
        maxUses: invite.max_uses === 0 ? null : invite.max_uses ?? null,
        uses: invite.uses ?? null,
    };
}

function isInviteExpired(invite: InviteCacheEntry) {
    const now = Date.now();
    const expired = invite.expiresAt !== null && invite.expiresAt <= now;
    const exhausted = invite.maxUses !== null && invite.uses !== null && invite.uses >= invite.maxUses;
    return expired || exhausted;
}

function canCreateInvite(channel?: Channel | null): channel is Channel {
    if (!channel || !channel.guild_id) return false;
    if (channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM()) return false;
    if (channel.isCategory()) return false;
    if (channel.isThread()) return false;
    return PermissionStore.can(PermissionsBits.CREATE_INSTANT_INVITE, channel);
}

function appendInviteCandidate(candidates: Map<string, Channel>, channel?: Channel | null) {
    if (!channel || !channel.guild_id || candidates.has(channel.id)) return;
    candidates.set(channel.id, channel);
}

function resolveInviteChannel(guildId: string, currentChannel: Channel): Channel | null {
    if (currentChannel.guild_id === guildId && canCreateInvite(currentChannel)) return currentChannel;

    const guild = GuildStore.getGuild(guildId);
    const preferredIds = [
        guild?.systemChannelId,
        guild?.rulesChannelId,
        guild?.publicUpdatesChannelId,
    ].filter(Boolean) as string[];

    for (const id of preferredIds) {
        const channel = ChannelStore.getChannel(id);
        if (canCreateInvite(channel)) return channel;
    }

    const candidatesById = new Map<string, Channel>();
    for (const entry of GuildChannelStore.getSelectableChannels?.(guildId) ?? []) {
        appendInviteCandidate(candidatesById, entry?.channel);
    }

    for (const entry of Object.values(GuildChannelStore.getChannels(guildId)?.SELECTABLE ?? {})) {
        appendInviteCandidate(candidatesById, entry && "channel" in entry ? entry.channel : entry);
    }

    return [...candidatesById.values()]
        .filter(channel => channel.guild_id === guildId)
        .sort((a, b) => {
            const pa = typeof a.position === "number" ? a.position : 0;
            const pb = typeof b.position === "number" ? b.position : 0;
            if (pa === pb) return a.id.localeCompare(b.id);
            return pa - pb;
        })
        .find(canCreateInvite) ?? null;
}

async function fetchReusableInvite(guildId: string, inviteChannelId: string) {
    const cached = inviteCache.get(guildId);
    if (cached && cached.maxUses === null && !isInviteExpired(cached)) return { ok: true as const, code: cached.code };

    try {
        const { body } = await RestAPI.get({ url: `/channels/${inviteChannelId}/invites` });
        if (!Array.isArray(body)) return { ok: false as const, reason: "failed" as const };

        const now = Date.now();
        const invite = body.find(inv => {
            const expiresAt = inv.expires_at ? Date.parse(inv.expires_at) : null;
            const maxUses = inv.max_uses === 0 ? null : inv.max_uses ?? null;
            const uses = inv.uses ?? null;
            const notExpired = expiresAt === null || expiresAt > now;
            const usesLeft = maxUses === null || uses === null || uses < maxUses;
            return notExpired && usesLeft && typeof inv.code === "string";
        });

        if (!invite?.code) return { ok: false as const, reason: "missing" as const };

        inviteCache.set(guildId, normalizeInviteCacheEntry(invite));
        return { ok: true as const, code: invite.code };
    } catch (error) {
        logger.error("Failed to reuse invite", error);
        return { ok: false as const, reason: "failed" as const };
    }
}

function getInviteUrl(code: string) {
    return `https://discord.gg/${code}`;
}

export async function createInvite(guildId: string, currentChannel: Channel, settings: InviteSettings): Promise<string | null> {
    const inviteChannel = resolveInviteChannel(guildId, currentChannel);
    if (!inviteChannel) {
        showToast("No channel available for invites.", Toasts.Type.FAILURE);
        return null;
    }

    if (settings.reuseExistingInvites) {
        const reused = await fetchReusableInvite(guildId, inviteChannel.id);
        if (reused.ok) return getInviteUrl(reused.code);

        showToast(
            reused.reason === "missing"
                ? "No reusable invite available."
                : "Unable to reuse invite.",
            Toasts.Type.FAILURE,
        );
        return null;
    }

    try {
        const maxAge = settings.inviteExpireAfter ?? 0;
        const maxUses = settings.inviteMaxUses ?? 0;
        const { body } = await RestAPI.post({
            url: `/channels/${inviteChannel.id}/invites`,
            body: {
                max_age: maxAge,
                max_uses: maxUses,
                temporary: settings.inviteTemporaryMembership,
                unique: true,
            },
        });

        const code = typeof body === "object" && body ? (body as { code?: string; }).code : null;
        if (!code) throw new Error("Invite response missing code");

        inviteCache.set(guildId, {
            code,
            expiresAt: maxAge > 0 ? Date.now() + maxAge * 1000 : null,
            maxUses: maxUses === 0 ? null : maxUses,
            uses: 0,
        });
        showToast("Invite created.", Toasts.Type.SUCCESS);
        return getInviteUrl(code);
    } catch (error) {
        logger.error("Failed to create invite", error);
        showToast("Unable to create invite.", Toasts.Type.FAILURE);
        return null;
    }
}

export function isGroupMessageChannel(channel?: Channel | null) {
    if (!channel) return false;
    return channel.type === ChannelType.GROUP_DM || channel.isGroupDM() || channel.isMultiUserDM();
}
