import type { ProfileBadge } from "@api/Badges";
import type { User, UserProfile } from "@vencord/discord-types";

export const SHARED_PROFILE_VERSION = 1;

export interface CustomBadgeDefinition {
    id: string;
    name: string;
    color: number;
    icon: string;
    enabled: boolean;
}

export interface SharedProfilePayload {
    version: typeof SHARED_PROFILE_VERSION;
    userId: string;
    customUsername: string;
    customDisplayName: string;
    selectedBadges: string[];
    selectedSpecialBadges: string[];
    customBadges: CustomBadgeDefinition[];
    replaceRealBadges: boolean;
    updatedAt: number;
}

export interface SharedEffectiveProfile {
    customUsername: string;
    customDisplayName: string;
    selectedBadges: string[];
    selectedSpecialBadges: string[];
    customBadges: CustomBadgeDefinition[];
    replaceRealBadges: boolean;
}

export interface NativeProfileBadge {
    id: string;
    description: string;
    icon: string;
}

export interface CustomProfileContributor {
    getEffectiveProfile(): SharedEffectiveProfile | null;
    patchSelfUser<T extends User>(user: T): T;
    patchSelfUserProfile(profile: UserProfile): UserProfile;
    getSelfNativeBadges(): NativeProfileBadge[] | null;
    getSelfBadgeApiBadges(userId: string): ProfileBadge[];
    publishSelfProfile?(userId: string): Promise<void>;
}

let contributor: CustomProfileContributor | null = null;

export function registerCustomProfileContributor(
    c: CustomProfileContributor | null,
) {
    contributor = c;
}

export function getCustomProfileContributor() {
    return contributor;
}

export function payloadToEffective(
    payload: SharedProfilePayload,
): SharedEffectiveProfile {
    return {
        customUsername: payload.customUsername,
        customDisplayName: payload.customDisplayName,
        selectedBadges: payload.selectedBadges,
        selectedSpecialBadges: payload.selectedSpecialBadges,
        customBadges: payload.customBadges ?? [],
        replaceRealBadges: payload.replaceRealBadges,
    };
}

export function profileHasSharedContent(
    profile: SharedEffectiveProfile,
): boolean {
    return Boolean(
        profile.customUsername ||
        profile.customDisplayName ||
        profile.selectedBadges.length ||
        profile.selectedSpecialBadges.length ||
        profile.customBadges.some((b) => b.enabled) ||
        profile.replaceRealBadges,
    );
}

export function toSharedPayload(
    userId: string,
    profile: SharedEffectiveProfile,
): SharedProfilePayload {
    return {
        version: SHARED_PROFILE_VERSION,
        userId,
        customUsername: profile.customUsername.trim(),
        customDisplayName: profile.customDisplayName.trim(),
        selectedBadges: profile.selectedBadges,
        selectedSpecialBadges: profile.selectedSpecialBadges,
        customBadges: profile.customBadges,
        replaceRealBadges: profile.replaceRealBadges,
        updatedAt: Date.now(),
    };
}
