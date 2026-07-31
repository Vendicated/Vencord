import {
    addProfileBadge,
    BadgePosition,
    ProfileBadge,
    removeProfileBadge,
} from "@api/Badges";
import type { User, UserProfile } from "@vencord/discord-types";
import { waitFor } from "@webpack";
import { FluxDispatcher, IconUtils, UserStore } from "@webpack/common";
import virtualMerge from "virtual-merge";

import {
    badgeIcon,
    BOOST_TIERS,
    buildNativeProfileBadges,
    buildNativeProfileBadgesFromEffective,
    computePublicFlags,
    monthsToPremiumSince,
    NITRO_TIERS,
    PROFILE_BADGES,
    SPECIAL_BADGES,
} from "./badges";
import { buildCustomProfileBadges } from "./customBadges";
import {
    buildCustomAvatarDecoration,
    resolveCustomProfileDecorationURL,
} from "./decorations";
import {
    getCustomBannerUrl,
    getCustomBio,
    getCustomPronouns,
    getCustomProfilePictureUrl,
    getProfileThemeColors,
    getSimulatedPremiumType,
    isSimulateNitroActive,
} from "./profileAppearance";
import {
    getRemoteEffectiveProfile,
    prefetchSharedProfile,
    profileHasContent,
    publishSharedProfile,
    toEffectiveFromLocal,
    type EffectiveProfile,
} from "./sharedProfile";
import { getProfile, settings as pluginSettings } from "./settings";

export interface CustomAvatarDecoration {
    asset: string;
    skuId: string;
    expires_at: null;
}

export function getCurrentUserId(): string | undefined {
    return UserStore.getCurrentUser()?.id;
}

export function isSelf(userId: string | null | undefined): boolean {
    if (!userId) return false;
    return userId === getCurrentUserId();
}

export function resolveEffectiveProfile(
    userId: string | null | undefined,
): EffectiveProfile | null {
    if (!userId) return null;
    if (isSelf(userId)) {
        const local = toEffectiveFromLocal();
        return profileHasContent(local) ? local : null;
    }
    return getRemoteEffectiveProfile(userId);
}

export function getCustomDisplayNameForUser(
    userId: string | null | undefined,
): string {
    const profile = resolveEffectiveProfile(userId);
    if (!profile) return "";
    return profile.customDisplayName.trim() || profile.customUsername.trim();
}

export function getAvatarDecorationOverride():
    | CustomAvatarDecoration
    | null
    | undefined {
    const profile = getProfile();
    if (!profile.avatarDecorationOverride) return undefined;
    const asset = profile.avatarDecoration.trim();
    if (!asset) return null;
    return buildCustomAvatarDecoration(asset);
}

export function pickAvatarDecoration<T>(
    componentOverride: T | null | undefined,
    customDecoration: CustomAvatarDecoration | null | undefined,
    fallback: T | null | undefined,
): T | null | undefined {
    if (customDecoration !== undefined) return customDecoration as T | null;
    return componentOverride ?? fallback;
}

export function getComputedPublicFlagsForUser(
    userId: string | null | undefined,
): number | null {
    const profile = resolveEffectiveProfile(userId);
    if (!profile) return null;

    const fakeFlags = computePublicFlags(profile.selectedBadges);
    if (profile.replaceRealBadges) return fakeFlags;

    if (!isSelf(userId)) return fakeFlags;
    return (UserStore.getCurrentUser()?.publicFlags ?? 0) | fakeFlags;
}

export function getPremiumType(): number {
    const profile = getProfile();
    const real = UserStore.getCurrentUser()?.premiumType ?? 0;
    if (profile.simulateNitro) return getSimulatedPremiumType(real);
    if (profile.replaceRealBadges) return profile.nitroTier !== "none" ? 2 : 0;
    if (profile.nitroTier === "none") return real;
    return 2;
}

export function getAvatarDecorationForUser(
    userId: string | null | undefined,
): CustomAvatarDecoration | null | undefined {
    if (!isSelf(userId)) return undefined;
    return getAvatarDecorationOverride();
}

function buildBadgesForUser(userId: string): ProfileBadge[] {
    const profile = resolveEffectiveProfile(userId);
    if (!profile) return [];

    const badges: ProfileBadge[] = [
        ...buildCustomProfileBadges(profile.customBadges),
    ];
    let idx = badges.length;

    if (profile.replaceRealBadges) return badges;

    for (const badgeId of profile.selectedBadges) {
        const def = PROFILE_BADGES.find((b) => b.id === badgeId);
        if (!def) continue;
        badges.push({
            id: `vc-cp-${def.id}-${idx++}`,
            description: def.description,
            iconSrc: badgeIcon(def.iconHash),
            position: BadgePosition.START,
        });
    }

    for (const specialId of profile.selectedSpecialBadges) {
        const def = SPECIAL_BADGES.find((b) => b.id === specialId);
        if (!def) continue;
        badges.push({
            id: `vc-cp-${def.id}-${idx++}`,
            description: def.description,
            iconSrc: badgeIcon(def.iconHash),
            position: BadgePosition.END,
        });
    }

    if (isSelf(userId)) {
        const local = getProfile();
        const nitro = NITRO_TIERS.find((t) => t.id === local.nitroTier);
        if (nitro && nitro.id !== "none" && nitro.iconHash) {
            badges.push({
                id: `vc-cp-nitro-${idx++}`,
                description: nitro.description || "Discord Nitro",
                iconSrc: badgeIcon(nitro.iconHash),
                position: BadgePosition.END,
            });
        }
        const boost = BOOST_TIERS.find((t) => t.id === local.boostTier);
        if (boost && boost.id !== "none" && boost.iconHash) {
            badges.push({
                id: `vc-cp-boost-${idx++}`,
                description: `Server Booster (${boost.name})`,
                iconSrc: badgeIcon(boost.iconHash),
                position: BadgePosition.END,
            });
        }
    }

    return badges;
}

export function patchUser<T extends User | null | undefined>(user: T): T {
    if (!user?.id) return user;

    const effective = resolveEffectiveProfile(user.id);
    if (!effective && !isSelf(user.id)) return user;

    return new Proxy(user, {
        get(target, prop, receiver) {
            if (isSelf(user.id)) {
                switch (prop) {
                    case "premiumType":
                        return getPremiumType();
                    case "avatarDecoration":
                    case "avatarDecorationData": {
                        const deco = getAvatarDecorationOverride();
                        if (deco !== undefined) return deco;
                        break;
                    }
                    case "themeColors": {
                        const colors = getProfileThemeColors();
                        if (colors) return colors;
                        break;
                    }
                    case "banner": {
                        const banner = getCustomBannerUrl(user.id);
                        if (banner) return banner;
                        break;
                    }
                    case "bio": {
                        const bio = getCustomBio(user.id);
                        if (bio) return bio;
                        break;
                    }
                    case "pronouns": {
                        const pronouns = getCustomPronouns(user.id);
                        if (pronouns) return pronouns;
                        break;
                    }
                }
            }

            if (!effective) return Reflect.get(target, prop, receiver);

            switch (prop) {
                case "publicFlags": {
                    const flags = getComputedPublicFlagsForUser(user.id);
                    if (flags != null) return flags;
                    break;
                }
                case "username": {
                    const custom = effective.customUsername.trim();
                    if (custom) return custom;
                    break;
                }
                case "globalName":
                case "global_name": {
                    const custom =
                        effective.customDisplayName.trim() ||
                        effective.customUsername.trim();
                    if (custom) return custom;
                    break;
                }
            }

            return Reflect.get(target, prop, receiver);
        },
    }) as T;
}

export function patchUserProfile(
    profile: UserProfile | null | undefined,
): UserProfile | null | undefined {
    if (!profile?.userId) return profile;

    const patches: Partial<UserProfile> = {};

    if (isSelf(profile.userId)) {
        const themeColors = getProfileThemeColors();
        if (themeColors) patches.themeColors = themeColors;

        const bio = getCustomBio(profile.userId);
        if (bio) patches.bio = bio;

        const pronouns = getCustomPronouns(profile.userId);
        if (pronouns) patches.pronouns = pronouns;

        const banner = getCustomBannerUrl(profile.userId);
        if (banner) patches.banner = banner;

        if (getProfile().replaceRealBadges) {
            const data = getProfile();
            const nitro = NITRO_TIERS.find((t) => t.id === data.nitroTier);
            const boost = BOOST_TIERS.find((t) => t.id === data.boostTier);
            patches.premiumType = nitro && nitro.id !== "none" ? 2 : 0;
            patches.premiumSince =
                nitro && nitro.id !== "none"
                    ? new Date(monthsToPremiumSince(nitro.months))
                    : null;
            patches.premiumGuildSince =
                boost && boost.id !== "none"
                    ? new Date(monthsToPremiumSince(boost.months))
                    : null;
        } else if (themeColors || isSimulateNitroActive()) {
            patches.premiumType = Math.max(getPremiumType(), 2);
        }
    }

    const effective = resolveEffectiveProfile(profile.userId);
    if (effective?.replaceRealBadges) {
        patches.badges = isSelf(profile.userId)
            ? buildNativeProfileBadges(getProfile())
            : buildNativeProfileBadgesFromEffective(effective);
    }

    if (Object.keys(patches).length === 0) return profile;
    return virtualMerge(profile, patches);
}

export function getNativeBadgesOverride(profile: { userId?: string }) {
    if (!profile?.userId) return null;
    const effective = resolveEffectiveProfile(profile.userId);
    if (!effective?.replaceRealBadges) return null;
    return isSelf(profile.userId)
        ? buildNativeProfileBadges(getProfile())
        : buildNativeProfileBadgesFromEffective(effective);
}

let badgeRegistration: ProfileBadge | null = null;

export function registerBadgeProvider() {
    if (badgeRegistration) return;
    badgeRegistration = {
        id: "vc-custom-profile-provider",
        getBadges({ userId }) {
            return buildBadgesForUser(userId);
        },
    };
    addProfileBadge(badgeRegistration);
}

export function clearBadges() {
    if (badgeRegistration) {
        removeProfileBadge(badgeRegistration);
        badgeRegistration = null;
    }
}

export function queuePrefetch(userId: string) {
    if (!userId || isSelf(userId)) return;
    void prefetchSharedProfile(userId, patchUser);
}

export async function applyProfileChanges() {
    const userId = getCurrentUserId();
    if (!userId) return;

    if (pluginSettings.store.sharePublicly) {
        await publishSharedProfile(userId, toEffectiveFromLocal());
    }

    FluxDispatcher.dispatch({
        type: "USER_UPDATE",
        user: patchUser(UserStore.getCurrentUser()),
    });
    FluxDispatcher.dispatch({
        type: "CURRENT_USER_UPDATE",
        user: patchUser(UserStore.getCurrentUser()),
    });
    FluxDispatcher.dispatch({ type: "USER_PROFILE_UPDATE", userId });
}

export function getCreationTimestampOverride(snowflake: string): number | null {
    if (!isSelf(snowflake)) return null;
    const date = getProfile().customAccountCreationDate.trim();
    if (!date) return null;
    const parsed = Date.parse(`${date}T12:00:00`);
    return Number.isNaN(parsed) ? null : parsed;
}

let originalExtractTimestamp: ((snowflake: string) => number) | null = null;
let patchedSnowflakeUtils: {
    extractTimestamp: (snowflake: string) => number;
} | null = null;

export function installCreationDateOverride() {
    waitFor(["fromTimestamp", "extractTimestamp"], (snowflakeUtils) => {
        if (originalExtractTimestamp) return;
        patchedSnowflakeUtils = snowflakeUtils;
        originalExtractTimestamp =
            snowflakeUtils.extractTimestamp.bind(snowflakeUtils);
        snowflakeUtils.extractTimestamp = (snowflake: string) => {
            const override = getCreationTimestampOverride(snowflake);
            return override ?? originalExtractTimestamp!(snowflake);
        };
    });
}

export function uninstallCreationDateOverride() {
    if (!originalExtractTimestamp || !patchedSnowflakeUtils) return;
    patchedSnowflakeUtils.extractTimestamp = originalExtractTimestamp;
    originalExtractTimestamp = null;
    patchedSnowflakeUtils = null;
}

const patchedDecorationUrlModules = new Set<object>();
const originalGetAvatarDecorationURLs = new WeakMap<
    object,
    (data: unknown) => string | undefined
>();

function patchGetAvatarDecorationURLModule(mod: Record<string, unknown>) {
    const fn = mod.getAvatarDecorationURL;
    if (typeof fn !== "function" || patchedDecorationUrlModules.has(mod))
        return;
    patchedDecorationUrlModules.add(mod);
    const original = fn.bind(mod);
    originalGetAvatarDecorationURLs.set(mod, original);
    mod.getAvatarDecorationURL = (data: unknown) => {
        const custom = resolveCustomProfileDecorationURL(
            data as Parameters<typeof resolveCustomProfileDecorationURL>[0],
        );
        if (custom != null) return custom || undefined;
        return original(data);
    };
}

export function installAvatarDecorationUrlHook() {
    if (IconUtils?.getAvatarDecorationURL) {
        patchGetAvatarDecorationURLModule(
            IconUtils as unknown as Record<string, unknown>,
        );
    }
    waitFor(["getAvatarDecorationURL"], patchGetAvatarDecorationURLModule);
    waitFor(
        ["getUserAvatarURL", "getAvatarDecorationURL"],
        patchGetAvatarDecorationURLModule,
    );
}

export function uninstallAvatarDecorationUrlHook() {
    for (const mod of patchedDecorationUrlModules) {
        const original = originalGetAvatarDecorationURLs.get(mod);
        if (original)
            (mod as Record<string, unknown>).getAvatarDecorationURL = original;
    }
    patchedDecorationUrlModules.clear();
}

export function toggleBadgeSelection(
    selected: string[],
    badgeId: string,
    exclusiveGroup?: string,
): string[] {
    const badge = PROFILE_BADGES.find((b) => b.id === badgeId);
    if (!badge) return selected;
    if (selected.includes(badgeId))
        return selected.filter((id) => id !== badgeId);
    let next = [...selected, badgeId];
    if (exclusiveGroup) {
        next = next.filter((id) => {
            const other = PROFILE_BADGES.find((b) => b.id === id);
            return (
                !other ||
                other.exclusiveGroup !== exclusiveGroup ||
                id === badgeId
            );
        });
    }
    return next;
}
