/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxStore } from "@webpack/types";

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
    type: 1;
}

export interface ProfileEffect extends Pick<ProfileEffectConfig, "id"> {
    config: ProfileEffectConfig;
    skuId: ProfileEffectConfig["sku_id"];
}

export let ProfileEffectRecord: {
    new (effect: Omit<ProfileEffect, "config">): typeof effect & Pick<ProfileEffectConfig, "type">;
    fromServer: (effect: Pick<ProfileEffectConfig, "id" | "sku_id">) => Omit<ProfileEffect, "config"> & Pick<ProfileEffectConfig, "type">;
};

export function setProfileEffectRecord(obj: typeof ProfileEffectRecord) {
    ProfileEffectRecord = obj;
}

export let ProfileEffectStore: FluxStore & {
    readonly isFetching: boolean;
    readonly fetchError: Error | undefined;
    readonly profileEffects: ProfileEffect[];
    readonly tryItOutId: string | null;
    getProfileEffectById: (effectId: string) => ProfileEffect | undefined;
};

export function setProfileEffectStore(store: typeof ProfileEffectStore) {
    ProfileEffectStore = store;
}
