/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxDispatcher, useState } from "@webpack/common";

import type { ProfileEffectConfig } from "./profileEffects";

function updatePreview() {
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SUBMIT_SUCCESS" });
}

let primaryColor: number | null = null;
export function usePrimaryColor(initialState: typeof primaryColor) {
    const temp = useState(() => primaryColor = initialState);
    return [
        temp[0],
        (color: typeof primaryColor) => {
            temp[1](primaryColor = color);
            if (showPreview) updatePreview();
        }
    ] as const;
}

let accentColor: number | null = null;
export function useAccentColor(initialState: typeof accentColor) {
    const temp = useState(() => accentColor = initialState);
    return [
        temp[0],
        (color: typeof accentColor) => {
            temp[1](accentColor = color);
            if (showPreview) updatePreview();
        }
    ] as const;
}

let profileEffect: ProfileEffectConfig | null = null;
export function useProfileEffect(initialState: typeof profileEffect) {
    const temp = useState(() => profileEffect = initialState);
    return [
        temp[0],
        (effect: typeof profileEffect) => {
            temp[1](profileEffect = effect);
            if (showPreview) updatePreview();
        }
    ] as const;
}

let showPreview = true;
export function useShowPreview(initialState: typeof showPreview) {
    const temp = useState(() => showPreview = initialState);
    return [
        temp[0],
        (preview: typeof showPreview) => {
            temp[1](showPreview = preview);
            updatePreview();
        }
    ] as const;
}

export function profilePreviewHook(props: any) {
    if (showPreview) {
        if (primaryColor !== null) {
            props.pendingThemeColors = [primaryColor, accentColor !== null ? accentColor : primaryColor];
            props.canUsePremiumCustomization = true;
        } else if (accentColor !== null) {
            props.pendingThemeColors = [accentColor, accentColor];
            props.canUsePremiumCustomization = true;
        }
        if (!props.forProfileEffectModal && profileEffect) {
            props.pendingProfileEffectId = profileEffect.id;
            props.canUsePremiumCustomization = true;
        }
    }
}
