/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isNonNullish, isTruthy } from "@utils/guards";
import { InventoryStore, RestAPI, UserStore } from "@webpack/common";

export function hasReachedLimit() {
    const { premiumType } = UserStore.getCurrentUser();
    const packLimit = isTruthy(premiumType) ? 100 : 1;

    return InventoryStore.countPacksCollected() >= packLimit;
}

export async function addPack(packId: string) {
    if (isNonNullish(InventoryStore.getPackByPackId({ packId }))) {
        throw new Error("This pack is already in your inventory.");
    }

    if (hasReachedLimit()) {
        throw new Error("You have reached the pack limit, you'll have to remove a pack before adding another!");
    }

    try {
        const { body: { name } } = await RestAPI.put({
            url: "/users/@me/inventory/packs/add",
            body: {
                pack_id: packId,
            }
        });

        return `Pack ${name} added to inventory.`;
    } catch {
        throw new Error("An error occured while adding the pack.");
    }
}

export async function removePack(packId: string) {
    const hasCollected = isNonNullish(InventoryStore.getPackByPackId({ packId }));

    if (!hasCollected) {
        throw new Error("You haven't added this pack to your inventory!");
    }

    try {
        await RestAPI.put({
            url: "/users/@me/inventory/packs/remove",
            body: {
                pack_id: packId,
            }
        });

        return "Pack removed from inventory.";
    } catch {
        throw new Error("An error occured while removing the pack.");
    }
}
