/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ChannelUnreadState {
    channelId: string;
    hasUnread: boolean;
    mentionCount: number;
    unreadCount: number;
}

export interface NotificationDotState {
    badgeText: string | null;
    hasMention: boolean;
    shouldShow: boolean;
}

export function getNotificationDotState(
    channelStates: ChannelUnreadState[],
    cachedUnreadCounts: Record<string, number>,
    shouldUseFallback: boolean
): NotificationDotState {
    const mentionCount = channelStates.reduce((count, state) => count + state.mentionCount, 0);
    if (mentionCount > 0) {
        return {
            badgeText: String(mentionCount),
            hasMention: true,
            shouldShow: true
        };
    }

    let unreadCount = 0;
    let fallbackCount = 0;

    for (const state of channelStates) {
        unreadCount += state.unreadCount;
        if (state.unreadCount > 0 || !shouldUseFallback || !state.hasUnread) continue;

        fallbackCount += Math.max(cachedUnreadCounts[state.channelId] ?? 0, 1);
    }

    const totalCount = unreadCount + fallbackCount;
    if (totalCount === 0) {
        return {
            badgeText: null,
            hasMention: false,
            shouldShow: false
        };
    }

    return {
        badgeText: fallbackCount > 0 ? `${totalCount}+` : String(totalCount),
        hasMention: false,
        shouldShow: true
    };
}

export function reconcileUnreadFallbackCache(
    cachedUnreadCounts: Record<string, number>,
    channelStates: ChannelUnreadState[]
): Record<string, number> {
    const nextCachedUnreadCounts = { ...cachedUnreadCounts };

    for (const state of channelStates) {
        if (state.unreadCount > 0) {
            nextCachedUnreadCounts[state.channelId] = state.unreadCount;
            continue;
        }

        if (!state.hasUnread) {
            delete nextCachedUnreadCounts[state.channelId];
        }
    }

    return nextCachedUnreadCounts;
}
