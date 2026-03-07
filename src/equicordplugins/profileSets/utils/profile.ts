/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import { CustomStatus, DisplayNameStyles, Nameplate, ProfileEffect, ProfilePreset } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, GuildMemberStore, IconUtils, UserProfileStore, UserStore } from "@webpack/common";

const UserProfileSettingsStore = findStoreLazy("UserProfileSettingsStore");
const CustomStatusSettings = getUserSettingLazy("status", "customStatus")!;

type PendingChanges = Record<string, unknown> & {
    selectedAvatarRaw?: ImageInput;
    presetAvatarRaw?: ImageInput;
    selectedAvatarProcessed?: ImageInput;
    presetAvatarProcessed?: ImageInput;
    pendingAvatar?: ImageInput;
    avatar?: ImageInput;
    pendingBanner?: ImageInput;
    banner?: ImageInput;
    pendingAvatarDecoration?: { asset: string; skuId: string; } | null;
    pendingProfileEffect?: ProfileEffect | null;
    pendingNameplate?: Nameplate | null;
    pendingDisplayNameStyles?: DisplayNameStyles | null;
    pendingAccentColor?: number | null;
    pendingThemeColors?: number[] | null;
    pendingBio?: string | null;
    pendingPronouns?: string | null;
    pendingNickname?: string | null;
    pendingGlobalName?: string | null;
    pendingPrimaryGuildId?: string | null;
};

type ImageInput = string | { imageUri: string; } | null | undefined;
type DisplayNameStylesLike = DisplayNameStyles & {
    fontId?: number;
    effectId?: number;
};

type CurrentProfileOptions = {
    isGuildProfile?: boolean;
};

type LoadPresetOptions = {
    skipGlobalName?: boolean;
    skipBio?: boolean;
    skipPronouns?: boolean;
    isGuildProfile?: boolean;
};

function dispatch(type: string, payload: Record<string, unknown>) {
    FluxDispatcher.dispatch({ type, ...payload });
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0;
}

function hasImageInput(value: ImageInput): boolean {
    if (!value) return false;
    if (typeof value === "string") return value.length > 0;
    return typeof value === "object" && isNonEmptyString(value?.imageUri);
}

function normalizeDisplayNameStyles(value: DisplayNameStylesLike | null | undefined): DisplayNameStylesLike | null {
    if (!value) return null;
    const fontId = value.fontId ?? value.font_id;
    const effectId = value.effectId ?? value.effect_id;
    if (typeof fontId !== "number" || typeof effectId !== "number") return null;
    const colors = Array.isArray(value.colors) ? [...value.colors] : [];

    return {
        fontId,
        effectId,
        font_id: fontId,
        effect_id: effectId,
        colors
    };
}

export async function imageUrlToBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

async function processImage(imageData: ImageInput, userId: string, type: "avatar" | "banner", guildId?: string, useGuildPath?: boolean): Promise<string | null> {
    if (!imageData) return null;

    if (typeof imageData === "object" && isNonEmptyString(imageData?.imageUri)) {
        return imageData.imageUri;
    }

    if (typeof imageData === "string") {
        if (imageData.startsWith("data:")) return imageData;
        if (/^https?:\/\//.test(imageData)) {
            return await imageUrlToBase64(imageData);
        }

        const isAnimated = imageData.startsWith("a_");
        const size = type === "banner" ? 1024 : 512;
        const urlPath = type === "banner" ? "banners" : "avatars";
        const guildPath = guildId ? `guilds/${guildId}/users/${userId}/${type === "banner" ? "banners" : "avatars"}` : urlPath;
        const guildUrl = `https://cdn.discordapp.com/${guildPath}/${imageData}.${isAnimated ? "gif" : "png"}?size=${size}`;
        const globalUrl = `https://cdn.discordapp.com/${urlPath}/${userId}/${imageData}.${isAnimated ? "gif" : "png"}?size=${size}`;
        if (useGuildPath && guildId) {
            const guildResult = await imageUrlToBase64(guildUrl);
            if (guildResult) return guildResult;
        }
        return await imageUrlToBase64(globalUrl);
    }

    return null;
}

export async function getCurrentProfile(guildId?: string, options: CurrentProfileOptions = {}): Promise<Omit<ProfilePreset, "name" | "timestamp">> {
    const currentUser = UserStore.getCurrentUser();
    const baseProfile = UserProfileStore.getUserProfile(currentUser.id);
    const isGuildProfile = options.isGuildProfile ?? Boolean(guildId);
    const effectiveGuildId = isGuildProfile ? guildId : undefined;
    const guildProfile = effectiveGuildId ? UserProfileStore.getGuildMemberProfile(currentUser.id, effectiveGuildId) : null;
    const userProfile = guildProfile ?? baseProfile;
    const userAny = currentUser;
    const guildMember = effectiveGuildId ? GuildMemberStore.getMember(effectiveGuildId, currentUser.id) : null;

    const pendingChangesDefault: PendingChanges = UserProfileSettingsStore.getPendingChanges() ?? {};
    const pendingChangesForGuild: PendingChanges = UserProfileSettingsStore.getPendingChanges(effectiveGuildId) ?? {};
    const pendingChanges: PendingChanges = isGuildProfile && Object.keys(pendingChangesForGuild).length > 0
        ? pendingChangesForGuild
        : pendingChangesDefault;

    const customStatusSetting = CustomStatusSettings.getSetting();
    const customStatus = isGuildProfile
        ? null
        : {
            text: customStatusSetting?.text ?? "",
            emojiId: customStatusSetting?.emojiId ?? "0",
            emojiName: customStatusSetting?.emojiName ?? "",
            expiresAtMs: customStatusSetting?.expiresAtMs ?? "0"
        };

    const avatarDecorationSource = pendingChanges.pendingAvatarDecoration ?? userAny.avatarDecorationData;
    const avatarDecoration = avatarDecorationSource ? {
        asset: avatarDecorationSource.asset,
        skuId: avatarDecorationSource.skuId
    } : null;

    let profileEffect: ProfileEffect | null = null;
    const effectToUse = pendingChanges.pendingProfileEffect ?? userProfile?.profileEffect;

    if (effectToUse) {
        if (effectToUse.skuId && effectToUse.effects) {
            profileEffect = {
                skuId: effectToUse.skuId,
                title: effectToUse.title,
                description: effectToUse.description,
                accessibilityLabel: effectToUse.accessibilityLabel,
                reducedMotionSrc: effectToUse.reducedMotionSrc,
                thumbnailPreviewSrc: effectToUse.thumbnailPreviewSrc,
                effects: effectToUse.effects,
                animationType: effectToUse.animationType,
                staticFrameSrc: effectToUse.staticFrameSrc,
                type: effectToUse.type || 1
            };
        } else if (effectToUse.skuId) {
            const collectibles = userProfile?.collectibles;
            const collectible = collectibles?.find(c => c?.skuId === effectToUse.skuId);
            if (collectible) {
                profileEffect = {
                    skuId: collectible.skuId,
                    title: collectible.title,
                    description: collectible.description,
                    accessibilityLabel: collectible.accessibilityLabel,
                    reducedMotionSrc: collectible.reducedMotionSrc,
                    thumbnailPreviewSrc: collectible.thumbnailPreviewSrc,
                    effects: collectible.effects,
                    animationType: collectible.animationType,
                    staticFrameSrc: collectible.staticFrameSrc,
                    type: collectible.type || 1
                };
            }
        }
    }

    const nameplateToUse = pendingChanges.pendingNameplate ?? userAny.collectibles?.nameplate;
    const nameplate = nameplateToUse ? {
        skuId: nameplateToUse.skuId,
        asset: nameplateToUse.asset,
        label: nameplateToUse.label,
        palette: typeof nameplateToUse.palette === "string" ? nameplateToUse.palette : undefined,
        type: nameplateToUse.type || 2
    } : null;

    const savedDisplayNameStyles = isGuildProfile
        ? (guildMember?.displayNameStyles ?? userAny.displayNameStyles)
        : userAny.displayNameStyles;
    const displayNameStylesToUse = pendingChanges.pendingDisplayNameStyles ?? savedDisplayNameStyles;
    const displayNameStyles = normalizeDisplayNameStyles(displayNameStylesToUse);

    const pendingAvatar = pendingChanges.pendingAvatar ?? pendingChanges.avatar;
    const avatarToUse: ImageInput = hasImageInput(pendingAvatar)
        ? pendingAvatar
        : (isGuildProfile ? (guildMember?.avatar ?? currentUser.avatar ?? null) : (currentUser.avatar ?? null));

    const useGuildAvatar = !!(effectiveGuildId && isGuildProfile && guildMember?.avatar && avatarToUse === guildMember.avatar);

    const avatarInput: ImageInput = hasImageInput(avatarToUse)
        ? avatarToUse
        : IconUtils.getUserAvatarURL(currentUser, true, 512);
    const avatarDataUrl = await processImage(avatarInput, currentUser.id, "avatar", effectiveGuildId, useGuildAvatar);
    const resolvedAvatarDataUrl = avatarDataUrl ?? IconUtils.getDefaultAvatarURL(currentUser.id);

    const pendingBanner = pendingChanges.pendingBanner ?? pendingChanges.banner;
    const bannerToUse: ImageInput = hasImageInput(pendingBanner)
        ? pendingBanner
        : (isGuildProfile ? (guildProfile?.banner ?? baseProfile?.banner) : baseProfile?.banner);
    const useGuildBanner = !!(effectiveGuildId && isGuildProfile && guildProfile?.banner && bannerToUse === guildProfile?.banner);

    const bannerDataUrl = await processImage(bannerToUse, currentUser.id, "banner", effectiveGuildId, useGuildBanner);

    return {
        avatarDataUrl: resolvedAvatarDataUrl,
        bannerDataUrl,
        bio: pendingChanges.pendingBio ?? userProfile?.bio ?? null,
        accentColor: pendingChanges.pendingAccentColor ?? userProfile?.accentColor ?? null,
        themeColors: pendingChanges.pendingThemeColors ?? userProfile?.themeColors ?? null,
        globalName: isGuildProfile
            ? (pendingChanges.pendingNickname ?? guildMember?.nick ?? null)
            : (pendingChanges.pendingGlobalName ?? currentUser.globalName ?? null),
        pronouns: isGuildProfile ? null : (pendingChanges.pendingPronouns ?? userProfile?.pronouns ?? null),
        avatarDecoration,
        profileEffect,
        nameplate,
        primaryGuildId: isGuildProfile
            ? null
            : (pendingChanges.pendingPrimaryGuildId ?? userAny.primaryGuild?.identityGuildId ?? null),
        customStatus,
        displayNameStyles
    };
}

function jsonEq(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    return JSON.stringify(a) === JSON.stringify(b);
}

function customStatusEq(a: CustomStatus | null | undefined, b: CustomStatus | null | undefined): boolean {
    if (a == null || b == null) return a == null && b == null;
    return a.text === b.text
        && String(a.emojiId ?? "") === String(b.emojiId ?? "")
        && a.emojiName === b.emojiName
        && String(a.expiresAtMs ?? "0") === String(b.expiresAtMs ?? "0");
}

function resolvePendingAvatar(pendingChanges: PendingChanges | null): ImageInput {
    if (!pendingChanges) return null;

    const candidates: ImageInput[] = [
        pendingChanges.selectedAvatarRaw,
        pendingChanges.presetAvatarRaw,
        pendingChanges.pendingAvatar,
        pendingChanges.avatar,
        pendingChanges.selectedAvatarProcessed,
        pendingChanges.presetAvatarProcessed
    ];
    return candidates.find(hasImageInput) ?? null;
}

function normalizeImageValue(value: unknown): string | null {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "imageUri" in value) {
        const { imageUri } = value as { imageUri: unknown; };
        return typeof imageUri === "string" ? imageUri : null;
    }
    return null;
}

function collectibleEqBySku(a: { skuId?: string | number | null; } | null | undefined, b: { skuId?: string | number | null; } | null | undefined): boolean {
    if (a == null || b == null) return a == null && b == null;
    return String(a.skuId ?? "") === String(b.skuId ?? "");
}

function avatarDecorationEq(a: { skuId?: string | number | null; asset?: string | null; } | null | undefined, b: { skuId?: string | number | null; asset?: string | null; } | null | undefined): boolean {
    if (a == null || b == null) return a == null && b == null;
    return String(a.skuId ?? "") === String(b.skuId ?? "") && String(a.asset ?? "") === String(b.asset ?? "");
}

function nameplateEq(a: { skuId?: string | number | null; asset?: string | null; } | null | undefined, b: { skuId?: string | number | null; asset?: string | null; } | null | undefined): boolean {
    if (a == null || b == null) return a == null && b == null;
    return String(a.skuId ?? "") === String(b.skuId ?? "") && String(a.asset ?? "") === String(b.asset ?? "");
}

export async function loadPresetAsPending(preset: ProfilePreset, guildId?: string, options: LoadPresetOptions = {}) {
    try {
        const isGuild = options.isGuildProfile ?? Boolean(guildId);
        if (isGuild && !guildId) return;
        const currentUser = UserStore.getCurrentUser();
        const baseProfile = UserProfileStore.getUserProfile(currentUser.id);
        const guildProfile = isGuild && guildId ? UserProfileStore.getGuildMemberProfile(currentUser.id, guildId) : null;
        const equippedProfile = guildProfile ?? baseProfile;
        const current = await getCurrentProfile(guildId, {
            isGuildProfile: isGuild
        });
        const pendingChanges = (isGuild && guildId
            ? UserProfileSettingsStore.getPendingChanges(guildId)
            : UserProfileSettingsStore.getPendingChanges());
        const equippedAvatarDecoration = currentUser.avatarDecorationData ?? null;
        const equippedProfileEffect = equippedProfile?.profileEffect ?? null;
        const equippedNameplate = currentUser.collectibles?.nameplate ?? null;
        const pendingAvatarDecoration = pendingChanges?.pendingAvatarDecoration ?? null;
        const pendingProfileEffect = pendingChanges?.pendingProfileEffect ?? null;
        const pendingNameplate = pendingChanges?.pendingNameplate ?? null;
        const setPending = (field: string, payload: Record<string, unknown>) => {
            const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
            if (!Object.keys(cleanPayload).length) return;
            dispatch(`USER_PROFILE_SETTINGS_SET_PENDING_${field}`, isGuild ? { ...cleanPayload, guildId } : cleanPayload);
        };

        if ("avatarDataUrl" in preset) {
            const avatarValue = preset.avatarDataUrl;
            const presetAvatar = normalizeImageValue(avatarValue);
            const currentAvatar = normalizeImageValue(current.avatarDataUrl);
            const pendingAvatar = normalizeImageValue(resolvePendingAvatar(pendingChanges));
            if (isGuild || (presetAvatar !== currentAvatar && presetAvatar !== pendingAvatar)) {
                const avatarPayload =
                    typeof avatarValue === "string" && avatarValue.startsWith("data:")
                        ? {
                            assetOrigin: "NEW_ASSET",
                            imageUri: avatarValue,
                            description: `profilesets-${preset.name ?? "preset"}`
                        }
                        : avatarValue;
                setPending("AVATAR", { avatar: avatarPayload });
            }
        }

        if ("bannerDataUrl" in preset && preset.bannerDataUrl !== current.bannerDataUrl) {
            setPending("BANNER", { banner: preset.bannerDataUrl });
        }

        if (!options.skipBio && preset?.bio !== current?.bio) {
            const bioValue = preset.bio === null ? "" : preset.bio;
            setPending("BIO", { bio: bioValue });
        }

        if (!isGuild && !options.skipPronouns && preset?.pronouns !== current?.pronouns) {
            const pronounsValue = preset.pronouns === null ? "" : preset.pronouns;
            setPending("PRONOUNS", { pronouns: pronounsValue });
        }

        if (!options.skipGlobalName && preset?.globalName !== current?.globalName) {
            if (isGuild) {
                setPending("NICKNAME", { nickname: preset.globalName });
            } else {
                setPending("GLOBAL_NAME", { globalName: preset.globalName });
            }
        }

        if (preset.avatarDecoration && ![pendingAvatarDecoration, equippedAvatarDecoration, current.avatarDecoration].some(d => avatarDecorationEq(preset.avatarDecoration, d))) {
            setPending("COLLECTIBLES_ITEM", {
                item: { type: 0, value: preset.avatarDecoration }
            });
        }

        if (preset.profileEffect && ![pendingProfileEffect, equippedProfileEffect, current.profileEffect].some(d => collectibleEqBySku(preset.profileEffect, d))) {
            setPending("COLLECTIBLES_ITEM", {
                item: { type: 1, value: preset.profileEffect }
            });
        }

        if (preset.nameplate && ![pendingNameplate, equippedNameplate, current.nameplate].some(d => nameplateEq(preset.nameplate, d))) {
            setPending("COLLECTIBLES_ITEM", {
                item: { type: 2, value: preset.nameplate }
            });
        }

        if (preset.displayNameStyles) {
            const presetDisplayNameStyles = normalizeDisplayNameStyles(preset.displayNameStyles);
            if (!jsonEq(presetDisplayNameStyles, current.displayNameStyles)) {
                setPending("DISPLAY_NAME_STYLES", { displayNameStyles: presetDisplayNameStyles });
            }
        }

        if (preset.themeColors && !jsonEq(preset.themeColors, current.themeColors)) {
            setPending("THEME_COLORS", { themeColors: preset.themeColors });
        }

        if (preset.primaryGuildId && !isGuild && preset.primaryGuildId !== current.primaryGuildId) {
            dispatch("USER_SETTINGS_SET_PENDING_PRIMARY_GUILD_ID", { primaryGuildId: preset.primaryGuildId });
        }

        if (preset.customStatus && !isGuild && !customStatusEq(preset.customStatus, current.customStatus)) {
            CustomStatusSettings.updateSetting({
                text: preset.customStatus?.text ?? "",
                expiresAtMs: preset.customStatus?.expiresAtMs ?? "0",
                emojiId: preset.customStatus?.emojiId ?? "0",
                emojiName: preset.customStatus?.emojiName ?? ""
            });
        }
    } catch (err) {
        throw err;
    }
}
