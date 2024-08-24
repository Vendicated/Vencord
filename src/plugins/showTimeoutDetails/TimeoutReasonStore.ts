/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { findByPropsLazy } from "@webpack";
import { Constants, Flux, FluxDispatcher, GuildMemberStore, PermissionsBits, PermissionStore, RestAPI, useStateFromStores } from "@webpack/common";

import { settings } from ".";

const AuditLogReasons: {
    MEMBER_UPDATE: number;
    AUTO_MODERATION_USER_COMMUNICATION_DISABLED: number;
    [reason: string]: number;
} = findByPropsLazy("ALL", "AUTO_MODERATION_USER_COMMUNICATION_DISABLED", "MEMBER_UPDATE");

export type TimeoutEntry = {
    reason: string | undefined;
    moderator: string | undefined;
    automod: boolean | undefined;
    expires: string | undefined; // used to compare if timeout reason is different
    loading: boolean;
};

export const NoTimeout: TimeoutEntry = {
    reason: undefined,
    moderator: undefined,
    automod: undefined,
    expires: undefined,
    loading: false
};

export const TimeoutLoading: TimeoutEntry = {
    reason: undefined,
    moderator: undefined,
    automod: undefined,
    expires: undefined,
    loading: true
};

export const TimeoutReasonStore = proxyLazy(() => {
    class TimeoutReasonStore extends Flux.Store {
        public reasonMap = new Map<string, TimeoutEntry>();

        getReason(guildId: string, userId: string) {
            const member = GuildMemberStore.getMember(guildId, userId);
            if (!member?.communicationDisabledUntil) return NoTimeout;
            const timeoutExpiry = new Date(member?.communicationDisabledUntil!);
            if (timeoutExpiry <= new Date()) return NoTimeout;
            const reason = this.reasonMap.get(`${guildId}-${userId}`);
            if (reason && !reason.loading && reason.expires === member?.communicationDisabledUntil) return reason;
            if (!PermissionStore.canWithPartialContext(PermissionsBits.VIEW_AUDIT_LOG, { guildId })) return NoTimeout;
            this.reasonMap.set(`${guildId}-${userId}`, TimeoutLoading);
            RestAPI.get({
                url: Constants.Endpoints.GUILD_AUDIT_LOG(guildId),
                query: {
                    target_id: userId,
                    limit: 100
                }
            }).then(logs => {
                const entry = logs.body.audit_log_entries.find((entry: { action_type: number; changes: any[]; }) => {
                    if (entry.action_type === AuditLogReasons.AUTO_MODERATION_USER_COMMUNICATION_DISABLED) return true;
                    if (entry.action_type === AuditLogReasons.MEMBER_UPDATE && entry?.changes.some((change: { key: string; }) => change.key === "communication_disabled_until")) return true;
                });
                if (!entry) return this.reasonMap.set(`${guildId}-${userId}`, NoTimeout);
                const isAutomod = entry.action_type === AuditLogReasons.AUTO_MODERATION_USER_COMMUNICATION_DISABLED;
                this.reasonMap.set(`${guildId}-${userId}`, {
                    reason: entry.reason,
                    moderator: isAutomod ? undefined : entry.user_id,
                    automod: isAutomod,
                    expires: member?.communicationDisabledUntil,
                    loading: false
                });
                this.emitChange();
            });
            return TimeoutLoading;
        }
    }

    const store = new TimeoutReasonStore(FluxDispatcher, {});

    return store;
});

export const useTimeoutReason = (guildId: string, userId: string) => useStateFromStores([TimeoutReasonStore], () => {
    if (settings.store.showReason) return TimeoutReasonStore.getReason(guildId, userId);
    return NoTimeout;
});
