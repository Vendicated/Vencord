/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { IconUtils } from "@webpack/common";

export const logger = new Logger("EditUsers");

export const enum OverrideFlags {
    None = 0,
    PreferServerNicks = 1 << 0,
    DisableNicks = 1 << 1,
    KeepServerAvatar = 1 << 2,
    DisableServerAvatars = 1 << 3,
    KeepServerBanner = 1 << 4,
    DisableServerBanners = 1 << 5,
    OverrideRoleColor = 1 << 6,
    UseDefaultAvatar = 1 << 7,
}

export type UserTag = "" | "BOT" | "OFFICIAL" | "SERVER" | "ORIGINAL_POSTER" | "NONE";

export interface CosmeticOverride {
    skuId: string;
    name?: string;
    asset?: string;
    label?: string;
    palette?: string;
}

export interface UserOverride {
    username: string;
    usernameColor: string;
    avatarUrl: string;
    bannerUrl: string;
    bannerColor: string;
    pronouns: string;
    decoration: string | CosmeticOverride;
    profileEffect: string | CosmeticOverride;
    nameplate: string | CosmeticOverride;
    profileFrame: string | CosmeticOverride;
    tag: UserTag;
    flags: OverrideFlags;
}

export const emptyOverride: UserOverride = Object.freeze({
    username: "",
    usernameColor: "",
    avatarUrl: "",
    bannerUrl: "",
    bannerColor: "",
    pronouns: "",
    decoration: "",
    profileEffect: "",
    nameplate: "",
    profileFrame: "",
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
    try {
        settings.use(["users"]);
        return getUserOverride(userId);
    } catch (error) {
        logger.error("Could not read user override", error);
        return emptyOverride;
    }
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

export function getDecorationUrl(decoration: UserOverride["decoration"] | undefined, size: number, canAnimate: boolean) {
    if (!decoration) {
        return;
    }

    try {
        // Older overrides only contain an asset hash and cannot be looked up by SKU.
        if (typeof decoration === "string") {
            const asset = encodeURIComponent(decoration);
            return `https://${window.GLOBAL_ENV.CDN_HOST}/avatar-decoration-presets/${asset}.png?size=${size}&passthrough=${canAnimate}`;
        }

        return IconUtils.getAvatarDecorationURL({
            avatarDecoration: { asset: decoration.asset ?? "", skuId: decoration.skuId, expires_at: null },
            size,
            canAnimate
        });
    } catch (error) {
        logger.error("Could not get decoration URL", error);
        return;
    }
}
