/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";

export const enum OverrideFlags {
    None = 0,
    PreferServerNicks = 1 << 0,
    DisableNicks = 1 << 1,
    KeepServerAvatar = 1 << 2,
    DisableServerAvatars = 1 << 3,
    KeepServerBanner = 1 << 4,
    DisableServerBanners = 1 << 5,
}

export interface UserOverride {
    username: string;
    avatarUrl: string;
    bannerUrl: string;
    pronouns: string;
    flags: OverrideFlags;
}

export const emptyOverride: UserOverride = Object.freeze({
    username: "",
    avatarUrl: "",
    bannerUrl: "",
    pronouns: "",
    flags: OverrideFlags.None,
});

export const settings = definePluginSettings({})
    .withPrivateSettings<{
        users?: Record<string, UserOverride>;
    }>();

export const getUserOverride = (userId: string) => settings.store.users?.[userId] ?? emptyOverride;

export const hasFlag = (field: OverrideFlags, flag: OverrideFlags) => (field & flag) === flag;
