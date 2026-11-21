/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, SettingsStore } from "@api/Settings";
import { React, useCallback } from "@webpack/common";

export const enum OverrideFlags {
    None = 0,
    PreferServerNicks = 1 << 0,
    DisableNicks = 1 << 1,
    KeepServerAvatar = 1 << 2,
    DisableServerAvatars = 1 << 3,
    KeepServerBanner = 1 << 4,
    DisableServerBanners = 1 << 5,
}

export type UserTag = "" | "BOT" | "OFFICIAL" | "SERVER" | "ORIGINAL_POSTER" | "NONE";

export interface UserOverride {
    username: string;
    avatarUrl: string;
    bannerUrl: string;
    bannerColor: string;
    pronouns: string;
    decoration: string;
    profileEffect: string;
    tag: UserTag;
    flags: OverrideFlags;
}

export const emptyOverride: UserOverride = Object.freeze({
    username: "",
    avatarUrl: "",
    bannerUrl: "",
    bannerColor: "",
    pronouns: "",
    decoration: "",
    profileEffect: "",
    tag: "",
    flags: OverrideFlags.None,
});

export const settings = definePluginSettings({})
    .withPrivateSettings<{
        users?: Record<string, Partial<UserOverride>>;
    }>();

export function getUserOverride(userId?: string) {
    return userId ? settings.plain.users?.[userId] ?? emptyOverride : emptyOverride;
}

export function useUserOverride(userId?: string) {
    const subscribe = useCallback((listener: () => void) => {
        if (!userId) {
            return () => {};
        }
        const path = `plugins.EditUsers.users.${userId}`;
        SettingsStore.addChangeListener(path, listener);
        return () => SettingsStore.removeChangeListener(path, listener);
    }, [userId]);
    const getSnapshot = () => getUserOverride(userId);
    return React.useSyncExternalStore(subscribe, getSnapshot);
}

export function saveUserOverride(userId: string, override: UserOverride) {
    const users = settings.store.users ??= {};
    if (Object.values(override).some(Boolean)) {
        users[userId] = override;
    } else {
        delete users[userId];
    }
}

export const hasFlag = (field: OverrideFlags | undefined, flag: OverrideFlags) => Boolean((field ?? 0) & flag);

export function getName(userId: string | undefined, nickname?: string | null) {
    const { username, flags } = getUserOverride(userId);
    if (hasFlag(flags, OverrideFlags.DisableNicks)) {
        return username || undefined;
    }

    if (hasFlag(flags, OverrideFlags.PreferServerNicks) && nickname) {
        return nickname;
    }
    return username || nickname || undefined;
}
