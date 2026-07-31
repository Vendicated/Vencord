/*
 * Vencord, a modification for Discord's desktop app
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addProfileBadge, ProfileBadge, removeProfileBadge } from "@api/Badges";
import {
    getCustomProfileContributor,
    profileHasSharedContent,
    type SharedEffectiveProfile,
} from "@api/SharedCustomProfiles";
import type { User, UserProfile } from "@vencord/discord-types";
import { UserStore } from "@webpack/common";
import virtualMerge from "virtual-merge";

import {
    buildBadgeApiBadges,
    buildNativeProfileBadges,
    computePublicFlags,
} from "./badges";
import { getRemoteEffectiveProfile } from "./registry";

export function getCurrentUserId(): string | undefined {
    return UserStore.getCurrentUser()?.id;
}

export function isSelf(userId: string | null | undefined): boolean {
    return Boolean(userId && userId === getCurrentUserId());
}

export function resolveEffectiveProfile(
    userId: string | null | undefined,
): SharedEffectiveProfile | null {
    if (!userId) return null;

    if (isSelf(userId)) {
        const self =
            getCustomProfileContributor()?.getEffectiveProfile() ?? null;
        return self && profileHasSharedContent(self) ? self : null;
    }

    return getRemoteEffectiveProfile(userId);
}

export function getDisplayNameForUser(
    userId: string | null | undefined,
): string {
    const profile = resolveEffectiveProfile(userId);
    if (!profile) return "";
    return profile.customDisplayName.trim() || profile.customUsername.trim();
}

export function getComputedPublicFlagsForUser(
    userId: string | null | undefined,
): number | null {
    const profile = resolveEffectiveProfile(userId);
    if (!profile) return null;

    const fakeFlags = computePublicFlags(profile.selectedBadges);
    if (profile.replaceRealBadges) return fakeFlags;

    if (!isSelf(userId)) return fakeFlags;

    const realFlags = UserStore.getCurrentUser()?.publicFlags ?? 0;
    return realFlags | fakeFlags;
}

export function patchSharedUser<T extends User | null | undefined>(user: T): T {
    if (!user?.id) return user;

    let patched = user;

    if (isSelf(user.id)) {
        const contributor = getCustomProfileContributor();
        if (contributor) patched = contributor.patchSelfUser(patched);
    }

    const effective = resolveEffectiveProfile(user.id);
    if (!effective) return patched;

    return new Proxy(patched, {
        get(target, prop, receiver) {
            switch (prop) {
                case "publicFlags": {
                    const flags = getComputedPublicFlagsForUser(user.id);
                    if (flags != null) return flags;
                    return Reflect.get(target, prop, receiver);
                }
                case "username": {
                    const custom = effective.customUsername.trim();
                    return custom || Reflect.get(target, prop, receiver);
                }
                case "globalName":
                case "global_name": {
                    const custom =
                        effective.customDisplayName.trim() ||
                        effective.customUsername.trim();
                    return custom || Reflect.get(target, prop, receiver);
                }
                default:
                    return Reflect.get(target, prop, receiver);
            }
        },
    }) as T;
}

export function patchSharedUserProfile(
    profile: UserProfile | null | undefined,
): UserProfile | null | undefined {
    if (!profile?.userId) return profile;

    let result = profile;

    if (isSelf(profile.userId)) {
        const contributor = getCustomProfileContributor();
        if (contributor) result = contributor.patchSelfUserProfile(result);
    }

    const effective = resolveEffectiveProfile(profile.userId);
    if (!effective?.replaceRealBadges) return result;

    const nativeBadges = isSelf(profile.userId)
        ? getCustomProfileContributor()?.getSelfNativeBadges()
        : buildNativeProfileBadges(effective);

    if (!nativeBadges) return result;

    return virtualMerge(result, { badges: nativeBadges });
}

let badgeRegistration: ProfileBadge | null = null;

function buildBadgesForUser(userId: string): ProfileBadge[] {
    if (isSelf(userId)) {
        return (
            getCustomProfileContributor()?.getSelfBadgeApiBadges(userId) ?? []
        );
    }

    const effective = resolveEffectiveProfile(userId);
    if (!effective) return [];
    return buildBadgeApiBadges(effective);
}

export function registerSharedBadgeProvider() {
    if (badgeRegistration) return;

    badgeRegistration = {
        id: "vc-shared-custom-profiles",
        getBadges({ userId }) {
            return buildBadgesForUser(userId);
        },
    };

    addProfileBadge(badgeRegistration);
}

export function unregisterSharedBadgeProvider() {
    if (badgeRegistration) {
        removeProfileBadge(badgeRegistration);
        badgeRegistration = null;
    }
}

export function getNativeBadgesOverride(profile: { userId?: string }) {
    if (!profile?.userId) return null;
    const effective = resolveEffectiveProfile(profile.userId);
    if (!effective?.replaceRealBadges) return null;

    if (isSelf(profile.userId)) {
        return getCustomProfileContributor()?.getSelfNativeBadges() ?? null;
    }

    return buildNativeProfileBadges(effective);
}
