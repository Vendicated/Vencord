/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxStore } from "@vencord/discord-types";

export interface QuestApplication {
    id: string;
    name: string;
    icon?: string;
    iconHash?: string;
    icon_id?: string;
}

export interface QuestReward {
    type?: string; // e.g. "ORBS", "IN_GAME_ITEM", etc.
    amount?: number;
    label?: string;
    currency?: string; // e.g. "ORBS"
}

export interface QuestMessages {
    questName?: string;
    title?: string;
    shortDescription?: string;
}

export interface QuestConfig {
    expiresAt?: string;
    application?: QuestApplication;
    messages?: QuestMessages;

    // Reward metadata – reverse-engineered; subject to change.
    rewards?: QuestReward[];
    reward?: QuestReward;
    orbReward?: QuestReward;

    // Other fields exist, but we do not need them for tracking.
    [key: string]: unknown;
}

export interface QuestUserStatus {
    enrolledAt?: string | null;
    completedAt?: string | null;
    [key: string]: unknown;
}

export interface Quest {
    id: string;
    config: QuestConfig;
    userStatus?: QuestUserStatus;
    [key: string]: unknown;
}

export interface QuestsStore extends FluxStore {
    quests: Map<string, Quest> | Record<string, Quest> | Quest[];
    getQuest(id: string): Quest | undefined;
}

export interface PersistedQuestState {
    /**
     * All quest IDs we have already notified about.
     */
    knownQuestIds: string[];
}
