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
    const [state, setState] = useState(() => primaryColor = initialState);
    return [
        state,
        (color: typeof primaryColor) => {
            setState(primaryColor = color);
            if (showPreview) updatePreview();
        }
    ] as const;
}

let accentColor: number | null = null;
export function useAccentColor(initialState: typeof accentColor) {
    const [state, setState] = useState(() => accentColor = initialState);
    return [
        state,
        (color: typeof accentColor) => {
            setState(accentColor = color);
            if (showPreview) updatePreview();
        }
    ] as const;
}

let profileEffect: ProfileEffectConfig | null = null;
export function useProfileEffect(initialState: typeof profileEffect) {
    const [state, setState] = useState(() => profileEffect = initialState);
    return [
        state,
        (effect: typeof profileEffect) => {
            setState(profileEffect = effect);
            if (showPreview) updatePreview();
        }
    ] as const;
}

let showPreview = true;
export function useShowPreview(initialState: typeof showPreview) {
    const [state, setState] = useState(() => showPreview = initialState);
    return [
        state,
        (preview: typeof showPreview) => {
            setState(showPreview = preview);
            updatePreview();
        }
    ] as const;
}

export function profilePreviewHook(props: Record<string, any>) {
    if (showPreview) {
        if (primaryColor !== null) {
            props.pendingThemeColors = [primaryColor, accentColor ?? primaryColor];
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
