/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "..";
import { decodeColor, decodeColorsLegacy, decodeEffect, extractFPTE } from "./fpte";
import { ProfileEffectStore } from "./profileEffects";

export interface UserProfile {
    bio: string;
    premiumType: number | null | undefined;
    profileEffectId: string | undefined;
    profileEffect: any;
    themeColors: [primaryColor: number, accentColor: number] | undefined;
}

function updateProfileThemeColors(profile: UserProfile, primary: number, accent: number) {
    if (primary > -1) {
        profile.themeColors = [primary, accent > -1 ? accent : primary];
        profile.premiumType = 2;
    } else if (accent > -1) {
        profile.themeColors = [accent, accent];
        profile.premiumType = 2;
    }
}

function updateProfileEffectId(profile: UserProfile, id: bigint) {
    if (id > -1n) {
        profile.profileEffect = ProfileEffectStore.getProfileEffectById(id.toString());
        profile.profileEffectId = id.toString();
        profile.premiumType = 2;
    }
}

export function decodeAboutMeFPTEHook(profile?: UserProfile) {
    if (!profile) return profile;

    if (settings.store.prioritizeNitro) {
        if (profile.themeColors) {
            if (!profile.profileEffectId) {
                const fpte = extractFPTE(profile.bio);
                if (decodeColor(fpte[0]) === -2)
                    updateProfileEffectId(profile, decodeEffect(fpte[1]));
                else
                    updateProfileEffectId(profile, decodeEffect(fpte[2]));
            }
            return profile;
        } else if (profile.profileEffectId) {
            const fpte = extractFPTE(profile.bio);
            const primaryColor = decodeColor(fpte[0]);
            if (primaryColor === -2)
                updateProfileThemeColors(profile, ...decodeColorsLegacy(fpte[0]));
            else
                updateProfileThemeColors(profile, primaryColor, decodeColor(fpte[1]));
            return profile;
        }
    }

    const fpte = extractFPTE(profile.bio);
    const primaryColor = decodeColor(fpte[0]);
    if (primaryColor === -2) {
        updateProfileThemeColors(profile, ...decodeColorsLegacy(fpte[0]));
        updateProfileEffectId(profile, decodeEffect(fpte[1]));
    } else {
        updateProfileThemeColors(profile, primaryColor, decodeColor(fpte[1]));
        updateProfileEffectId(profile, decodeEffect(fpte[2]));
    }

    return profile;
}
