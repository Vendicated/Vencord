/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCodeLazy, findStoreLazy } from "@webpack";
import type { FluxStore } from "@webpack/types";
import type { SnakeCasedProperties } from "type-fest";

export const ProfileEffectStore: FluxStore & {
    canFetch: () => boolean;
    getProfileEffectById: (effectId: string) => ProfileEffect | undefined;
    hasFetched: () => boolean;
    readonly fetchError: Error | undefined;
    readonly isFetching: boolean;
    readonly profileEffects: ProfileEffect[];
    readonly tryItOutId: string | null;
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
        duartion: number;
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
    sku_id: string;
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
