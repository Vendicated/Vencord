/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Quest } from "@vencord/discord-types";
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

export type ClaimRewardResult =
    | { status: "ok"; body: any }
    | { status: "captcha"; body: any }
    | { status: "error"; error: unknown };

/**
 * Attempts to claim the quest reward for a completed quest.
 */
export async function claimQuestReward(questId: string): Promise<ClaimRewardResult> {
    try {
        const res = await RestAPI.post({
            url: `/quests/${questId}/claim-reward`,
            body: {
                platform: 0,
                location: 11,
                is_targeted: false,
                metadata_raw: null,
                metadata_sealed: null,
            },
        });

        const body = res.body ?? {};
        const requiresCaptcha =
            Array.isArray(body?.captcha_key)
            || body?.captcha_sitekey
            || body?.captcha_service
            || body?.captcha_session_id
            || body?.captcha_rqdata
            || body?.captcha_rqtoken;

        if (requiresCaptcha) {
            QuestSpooferLogger.warn(
                "Quest reward claim requires captcha; manual claim needed.",
            );
            return { status: "captcha", body };
        }

        QuestSpooferLogger.info("Quest reward claimed successfully.");
        return { status: "ok", body };
    } catch (err) {
        QuestSpooferLogger.error("Failed to claim quest reward:", err);
        return { status: "error", error: err };
    }
}

/**
 * Fetches the current user's quests and filters out completed or expired ones.
 */
export async function fetchQuests(): Promise<Quest[]> {
    try {
        const res = await RestAPI.get({ url: "/quests/@me" });
        const quests = res.body?.quests ?? [];

        return quests.filter(q => {
            const userStatus = q.user_status;
            if (!userStatus) return false;
            if (userStatus.completed_at) return false;

            const expires = new Date(q.config.expires_at).getTime();
            return expires > Date.now();
        });
    } catch (err) {
        QuestSpooferLogger.error("Failed to fetch quests from API:", err);
        return [];
    }
}
