/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type ModalProps, openModal } from "@utils/modal";
import { extractAndLoadChunksLazy } from "@webpack";
import type { ComponentType, FunctionComponent, PropsWithChildren, ReactNode } from "react";

import type { ProfileEffectConfig } from "../lib/profileEffects";

export * from "./Builder";
export * from "./BuilderButton";
export * from "./BuilderColorButton";
export * from "./settingsAboutComponent";

export interface CustomColorPickerProps {
    value?: number | null | undefined;
    onChange: (color: number) => void;
    onClose?: (() => void) | undefined;
    suggestedColors?: string[] | undefined;
    middle?: ReactNode;
    footer?: ReactNode;
    showEyeDropper?: boolean | undefined;
}

export let CustomColorPicker: ComponentType<CustomColorPickerProps> = () => null;

export function setCustomColorPicker(comp: typeof CustomColorPicker) {
    CustomColorPicker = comp;
}

export let useAvatarColors: (avatarURL: string, fillerColor?: string | undefined, desaturateColors?: boolean | undefined) => string[] = () => [];

export function setUseAvatarColors(hook: typeof useAvatarColors) {
    useAvatarColors = hook;
}

export interface CustomizationSectionProps {
    title?: ReactNode;
    titleIcon?: ReactNode;
    titleId?: string | undefined;
    description?: ReactNode;
    className?: string | undefined;
    errors?: string[] | undefined;
    disabled?: boolean | undefined;
    hideDivider?: boolean | undefined;
    showBorder?: boolean | undefined;
    borderType?: "limited" | "premium" | undefined;
    hasBackground?: boolean | undefined;
    forcedDivider?: boolean | undefined;
    showPremiumIcon?: boolean | undefined;
}

export let CustomizationSection: ComponentType<PropsWithChildren<CustomizationSectionProps>> = () => null;

export function setCustomizationSection(comp: typeof CustomizationSection) {
    CustomizationSection = comp;
}

export interface ProfileEffectModalProps extends ModalProps {
    initialSelectedEffectId?: string | undefined;
    onApply: (effect: ProfileEffectConfig | null) => void;
}

export let ProfileEffectModal: FunctionComponent<ProfileEffectModalProps> = () => null;

export function setProfileEffectModal(comp: typeof ProfileEffectModal) {
    ProfileEffectModal = comp;
}

const requireProfileEffectModal = extractAndLoadChunksLazy(["openProfileEffectModal:function(){"]);

export function openProfileEffectModal(initialEffectId: ProfileEffectModalProps["initialSelectedEffectId"], onApply: ProfileEffectModalProps["onApply"]) {
    requireProfileEffectModal().then(() => {
        openModal(modalProps => (
            <ProfileEffectModal
                {...modalProps}
                initialSelectedEffectId={initialEffectId}
                onApply={onApply}
            />
        ));
    });
}
