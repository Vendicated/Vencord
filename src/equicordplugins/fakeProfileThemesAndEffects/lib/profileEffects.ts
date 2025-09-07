/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxStore } from "@vencord/discord-types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import type { SnakeCasedProperties } from "type-fest";

export const ProfileEffectStore: FluxStore & {
    canFetchAll: () => boolean;
    getProfileEffectById: (effectId: string) => ProfileEffect | undefined;
    isFetchingAll: () => boolean;
    getAllProfileEffects: () => ProfileEffect[];
} = findStoreLazy("ProfileEffectStore");

export const ProfileEffectRecord: {
    new(profileEffectProperties: ProfileEffectProperties): ProfileEffectRecordInstance;
    fromServer: (profileEffectFromServer: SnakeCasedProperties<ProfileEffectProperties>) => ProfileEffectRecordInstance;
} = findByCodeLazy(",this.type=", ".PROFILE_EFFECT");

export type ProfileEffectProperties = Omit<ProfileEffectRecordInstance, "type">;

export interface ProfileEffectRecordInstance {
    id: string;
    skuId: string;
    type: CollectiblesItemType.PROFILE_EFFECT;
}

export interface ProfileEffect {
    config: ProfileEffectConfig;
    id: string;
    skuId: string;
}

export interface ProfileEffectConfig {
    accessibilityLabel: string;
    animationType: number;
    description: string;
    effects: {
        duration: number;
        height: number;
        loop: boolean;
        loopDelay: number;
        position: {
            x: number;
            y: number;
        };
        src: string;
        start: number;
        width: number;
        zIndex: number;
    }[];
    id: string;
    reducedMotionSrc: string;
    skuId: string;
    staticFrameSrc?: string;
    thumbnailPreviewSrc: string;
    title: string;
    type: CollectiblesItemType.PROFILE_EFFECT;
}

export const enum CollectiblesItemType {
    AVATAR_DECORATION = 0,
    PROFILE_EFFECT = 1,
    NONE = 100,
    BUNDLE = 1_000,
}
