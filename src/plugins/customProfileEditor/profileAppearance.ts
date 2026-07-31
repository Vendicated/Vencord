import { UserStore } from "@webpack/common";

import {
    DEFAULT_PROFILE_THEME_ACCENT,
    DEFAULT_PROFILE_THEME_PRIMARY,
    getProfileThemeColors as getThemeColorsFromSettings,
} from "./profileTheme";
import { getProfile } from "./settings";

function isSelf(userId: string | null | undefined): boolean {
    if (!userId) return false;
    return userId === UserStore.getCurrentUser()?.id;
}

export function isSimulateNitroActive(): boolean {
    return getProfile().simulateNitro;
}

export function getCustomProfilePictureUrl(
    userId: string | null | undefined,
): string | null {
    if (!isSelf(userId)) return null;
    const url = getProfile().customProfilePicture.trim();
    return url || null;
}

export function getCustomBannerUrl(
    userId: string | null | undefined,
): string | null {
    if (!isSelf(userId)) return null;
    if (!isSimulateNitroActive()) return null;
    const url = getProfile().customBanner.trim();
    return url || null;
}

export function getCustomBio(userId: string | null | undefined): string | null {
    if (!isSelf(userId)) return null;
    const bio = getProfile().customBio.trim();
    return bio || null;
}

export function getCustomPronouns(
    userId: string | null | undefined,
): string | null {
    if (!isSelf(userId)) return null;
    const pronouns = getProfile().customPronouns.trim();
    return pronouns || null;
}

/** Theme colors when profile theme or simulate nitro is active. */
export function getProfileThemeColors(): [number, number] | null {
    const profile = getProfile();
    const fromTheme = getThemeColorsFromSettings();
    if (fromTheme) return fromTheme;
    if (profile.simulateNitro) {
        return [DEFAULT_PROFILE_THEME_PRIMARY, DEFAULT_PROFILE_THEME_ACCENT];
    }
    return null;
}

export function getSimulatedPremiumType(currentPremium: number): number {
    if (!isSimulateNitroActive()) return currentPremium;
    return Math.max(currentPremium, 2);
}
