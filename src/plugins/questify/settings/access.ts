/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, useSettings } from "@api/Settings";
import { UserStore } from "@webpack/common";

export const QUESTIFY_PLUGIN_NAME = "Questify";

interface QuestifySettingsOverrides {
    ignoredQuestIDs: Record<string, string[]>;
    resumeQuestIDs: Record<string, { timestamp: number, questIDs: string[]; }>;
}

type QuestifySettings = Settings["plugins"][typeof QUESTIFY_PLUGIN_NAME] & QuestifySettingsOverrides;

export function getQuestifySettings(): QuestifySettings {
    return Settings.plugins[QUESTIFY_PLUGIN_NAME] as QuestifySettings;
}

export function useQuestifySettings<K extends keyof QuestifySettings & string>(keys: readonly K[]): Pick<QuestifySettings, K> {
    return useSettings(keys.map(key => `plugins.${QUESTIFY_PLUGIN_NAME}.${key}`) as any).plugins[QUESTIFY_PLUGIN_NAME] as unknown as Pick<QuestifySettings, K>;
}

export function getCurrentUserId(userId?: string): string | null {
    return userId ?? UserStore.getCurrentUser()?.id ?? null;
}
