/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxStore } from "@vencord/discord-types";
import { findByCodeLazy, findStoreLazy } from "@webpack";

export const enum CosmeticType {
    AvatarDecoration = 0,
    ProfileEffect = 1,
    Nameplate = 2,
    ProfileFrame = 3,
}

interface ShopItem {
    type: CosmeticType;
    skuId: string;
    asset?: string;
    label?: string;
    palette?: string;
}

interface ShopProduct {
    name: string;
    items: ShopItem[];
}

const ShopStore = findStoreLazy("CollectiblesCategoryStore") as FluxStore & {
    getProduct(skuId: string): ShopProduct | undefined;
};

const fetchProduct = findByCodeLazy('"COLLECTIBLES_PRODUCT_FETCH_SUCCESS"', "include_bundles") as (skuId: string) => Promise<void>;
const pendingProducts = new Map<string, Promise<ShopProduct | undefined>>();

export async function getShopProduct(skuId: string) {
    const product = ShopStore.getProduct(skuId);
    if (product) {
        return product;
    }

    let pending = pendingProducts.get(skuId);
    if (!pending) {
        pending = fetchProduct(skuId)
            .then(() => ShopStore.getProduct(skuId))
            .finally(() => pendingProducts.delete(skuId));
        pendingProducts.set(skuId, pending);
    }
    return pending;
}
