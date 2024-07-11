/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type ModalProps, openModal } from "@utils/modal";
import { extractAndLoadChunksLazy, findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import type { Guild } from "discord-types/general";
import type { ComponentType, FunctionComponent, PropsWithChildren, ReactNode } from "react";

import type { ProfileEffectConfig } from "../lib/profileEffects";

export * from "./Builder";
export * from "./BuilderButton";
export * from "./BuilderColorButton";
export * from "./settingsAboutComponent";

export interface CustomizationSectionProps extends PropsWithChildren {
    borderType?: "limited" | "premium" | undefined;
    className?: string | undefined;
    description?: ReactNode;
    disabled?: boolean | undefined /* = false */;
    errors?: string[] | undefined;
    forcedDivider?: boolean | undefined /* = false */;
    hasBackground?: boolean | undefined /* = false */;
    hideDivider?: boolean | undefined /* = false */;
    showBorder?: boolean | undefined /* = false */;
    showPremiumIcon?: boolean | undefined /* = false */;
    title?: ReactNode;
    titleIcon?: ReactNode;
    titleId?: string | undefined;
}

export const CustomizationSection: ComponentType<CustomizationSectionProps>
    = findByCodeLazy(".customizationSectionBackground");

export const useAvatarColors: (
    avatarURL: string,
    fillerColor?: string | undefined,
    desaturateColors?: boolean | undefined /* = true */
) => string[] = findByCodeLazy(".palette[", ".desaturateUserColors");

export interface CustomColorPickerProps {
    className?: string | undefined;
    eagerUpdate?: boolean | undefined /* = false */;
    footer?: ReactNode;
    middle?: ReactNode;
    onChange: (color: number) => void;
    onClose?: (() => void) | undefined;
    showEyeDropper?: boolean | null | undefined /* = false */;
    suggestedColors?: string[] | undefined;
    wrapperComponentType?: ComponentType | null | undefined;
    value?: string | number | null | undefined;
}

export const CustomColorPicker = findComponentByCodeLazy<CustomColorPickerProps>(".customColorPicker");

export interface ProfileEffectModalProps extends ModalProps {
    analyticsLocations?: string[] | undefined;
    guild?: Guild | null | undefined;
    initialSelectedEffectId?: string | undefined;
    onApply: (effect: ProfileEffectConfig | null) => void;
}

export let ProfileEffectModal: FunctionComponent<ProfileEffectModalProps> = () => null;

export function setProfileEffectModal(comp: typeof ProfileEffectModal) {
    ProfileEffectModal = comp;
}

const requireProfileEffectModal = extractAndLoadChunksLazy([".openModalLazy", "initialSelectedEffectId:"]);

export async function openProfileEffectModal(
    initialEffectId: ProfileEffectModalProps["initialSelectedEffectId"],
    onApply: ProfileEffectModalProps["onApply"],
    guild?: ProfileEffectModalProps["guild"]
) {
    await requireProfileEffectModal();
    openModal(modalProps => (
        <ProfileEffectModal
            {...modalProps}
            initialSelectedEffectId={initialEffectId}
            guild={guild}
            onApply={onApply}
        />
    ));
}
