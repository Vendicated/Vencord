/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { QuestSpooferLogger } from "@plugins/questSpoofer/constants";
import { RestAPI } from "@webpack/common";

/**
 * Posts video progress for a quest at a given timestamp.
 */
export async function postVideoProgress(questId: string, timestamp: number) {
    return RestAPI.post({
        url: `/quests/${questId}/video-progress`,
        body: { timestamp },
    });
}

/**
 * Sends quest heartbeat events for activity/stream quests.
 */
export async function postActivityHeartbeat(
    questId: string,
    streamKey: string,
    terminal = false,
) {
    return RestAPI.post({
        url: `/quests/${questId}/heartbeat`,
        body: { stream_key: streamKey, terminal },
    });
}

/**
 * Fetches the current user's quests and filters out completed or expired ones.
 */
export async function fetchQuests() {
    try {
        const res = await RestAPI.get({ url: "/quests/@me" });
        const quests = res.body?.quests ?? [];

        return quests.filter(q => {
            const userStatus = q.user_status;
            if (!userStatus) return false;
            if (userStatus.completed_at) return false;

            const expires = new Date(q.config.expires_at).getTime();
            if (expires <= Date.now()) return false;

            return true;
        });
    } catch (err) {
        QuestSpooferLogger.error("Failed to fetch quests from API:", err);
        return [];
    }
}
