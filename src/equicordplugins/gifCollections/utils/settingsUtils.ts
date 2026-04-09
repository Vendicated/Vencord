/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { chooseFile, saveFile } from "@utils/web";
import { Toasts } from "@webpack/common";

import { DATA_COLLECTION_NAME, getCollections, refreshCacheCollection } from "./collectionManager";
import { logger } from "./misc";

export async function downloadCollections() {
    const exportData = await exportCollections();
    const data = new TextEncoder().encode(exportData);

    if (IS_DISCORD_DESKTOP) {
        DiscordNative.fileManager.saveWithDialog(data, "gif-collections.json");
    } else {
        saveFile(new File([data], "gif-collections.json", { type: "application/json" }));
    }
}

export async function exportCollections() {
    const collections = await getCollections();
    return JSON.stringify({ collections }, null, 4);
}

export async function importCollections(data: string) {
    const parsed = JSON.parse(data);

    if ("collections" in parsed) {
        await DataStore.set(DATA_COLLECTION_NAME, parsed.collections);
        await refreshCacheCollection();
    } else {
        throw new Error("Invalid collections format");
    }
}

export async function uploadGifCollections(showToast = true): Promise<void> {
    if (IS_DISCORD_DESKTOP) {
        const [file] = await DiscordNative.fileManager.openFiles({
            filters: [
                { name: "Gif Collections", extensions: ["json"] },
                { name: "all", extensions: ["*"] },
            ],
        });

        if (file) {
            try {
                await importCollections(new TextDecoder().decode(file.data));
                if (showToast) toastSuccess();
            } catch (err) {
                logger.error("Failed to import collections", err);
                if (showToast) toastFailure(err);
            }
        }
    } else {
        const file = await chooseFile("application/json");
        if (!file) return;

        try {
            await importCollections(await file.text());
            if (showToast) toastSuccess();
        } catch (err) {
            logger.error("Failed to import collections", err);
            if (showToast) toastFailure(err);
        }
    }
}

const toastSuccess = () => Toasts.show({
    type: Toasts.Type.SUCCESS,
    message: "Collections imported successfully.",
    id: Toasts.genId(),
});

const toastFailure = (err: unknown) => Toasts.show({
    type: Toasts.Type.FAILURE,
    message: `Failed to import collections: ${String(err)}`,
    id: Toasts.genId(),
});
