/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { findByPropsLazy } from "@webpack";
import { Constants, Flux, FluxDispatcher, GuildMemberStore, PermissionsBits, PermissionStore, RestAPI, useStateFromStores } from "@webpack/common";


const AuditLogReasons: {
    MEMBER_UPDATE: number;
    AUTO_MODERATION_USER_COMMUNICATION_DISABLED: number;
    [reason: string]: number;
} = findByPropsLazy("ALL", "AUTO_MODERATION_USER_COMMUNICATION_DISABLED", "MEMBER_UPDATE");

export type TimeoutEntry = {
    reason: string | undefined;
    moderator: string | undefined; // User ID of moderator, undefined if automod did the timeout
    automod: boolean | undefined;
    automodRuleName: string | undefined;
    automodChannelId: string | undefined;
    expires: string | undefined; // used to compare if timeout reason is different
    loading: boolean;
};

export const NoTimeout: TimeoutEntry = {
    reason: undefined,
    moderator: undefined,
    automod: undefined,
    automodRuleName: undefined,
    automodChannelId: undefined,
    expires: undefined,
    loading: false
};

export const TimeoutLoading: TimeoutEntry = {
    reason: undefined,
    moderator: undefined,
    automod: undefined,
    automodRuleName: undefined,
    automodChannelId: undefined,
    expires: undefined,
    loading: true
};

export const TimeoutReasonStore = proxyLazy(() => {
    class TimeoutReasonStore extends Flux.Store {
        public reasonMap = new Map<string, TimeoutEntry>();

        getReason(guildId: string, userId: string) {
            const member = GuildMemberStore.getMember(guildId, userId);

            if (!member?.communicationDisabledUntil) return NoTimeout;
            if (new Date(member?.communicationDisabledUntil!) <= new Date()) return NoTimeout;

            const reason = this.reasonMap.get(`${guildId}-${userId}`);
            // Return if timeout reason entry is found and is up to date, or if it's still loading
            if (reason && (reason.loading ? true : reason.expires === member?.communicationDisabledUntil)) return reason;

            // The indicator being visible does not depend on any data here. This just returns that there's no extra information about the timeout.
            if (!PermissionStore.canWithPartialContext(PermissionsBits.VIEW_AUDIT_LOG, { guildId })) return NoTimeout;

            // Stop requesting data multiple times
            this.reasonMap.set(`${guildId}-${userId}`, TimeoutLoading);

            RestAPI.get({
                url: Constants.Endpoints.GUILD_AUDIT_LOG(guildId),
                query: {
                    // action_type is intentionally not specified here as we need multiple types of audit log actions.
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
                    automodRuleName: isAutomod ? entry?.options?.auto_moderation_rule_name : undefined,
                    automodChannelId: isAutomod ? entry?.options?.channel_id : undefined,
                    expires: member?.communicationDisabledUntil,
                    loading: false
                });

                // Re-render the timeout indicator components
                this.emitChange();
            });

            return TimeoutLoading;
        }
    }

    const store = new TimeoutReasonStore(FluxDispatcher, {});

    return store;
});

export const useTimeoutReason = (guildId: string, userId: string) => useStateFromStores([TimeoutReasonStore], () => {
    return TimeoutReasonStore.getReason(guildId, userId);
});
