/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Toasts } from "@webpack/common";

import { DATA_COLLECTION_NAME, getCollections, refreshCacheCollection } from "./collectionManager";

// 99% of this is coppied from src\utils\settingsSync.ts

export async function downloadCollections() {
    const filename = "gif-collections.json";
    const exportData = await exportCollections();
    const data = new TextEncoder().encode(exportData);

    if (IS_WEB || IS_EQUIBOP || IS_VESKTOP) {
        const file = new File([data], filename, { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = filename;

        document.body.appendChild(a);
        a.click();
        setImmediate(() => {
            URL.revokeObjectURL(a.href);
            document.body.removeChild(a);
        });
    } else {
        DiscordNative.fileManager.saveWithDialog(data, filename);
    }

}

export async function exportCollections() {
    const collections = await getCollections();
    return JSON.stringify({ collections }, null, 4);
}


export async function importCollections(data: string) {
    try {
        var parsed = JSON.parse(data);
    } catch (err) {
        console.log(data);
        throw new Error("Failed to parse JSON: " + String(err));
    }

    if ("collections" in parsed) {
        await DataStore.set(DATA_COLLECTION_NAME, parsed.collections);
        await refreshCacheCollection();
    } else
        throw new Error("Invalid Collections");
}


export async function uploadGifCollections(showToast = true): Promise<void> {
    if (IS_WEB || IS_EQUIBOP || IS_VESKTOP) {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        input.accept = "application/json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    await importCollections(reader.result as string);
                    if (showToast) toastSuccess();
                } catch (err) {
                    console.error(err);
                    // new Logger("SettingsSync").error(err);
                    if (showToast) toastFailure(err);
                }
            };
            reader.readAsText(file);
        };

        document.body.appendChild(input);
        input.click();
        setImmediate(() => document.body.removeChild(input));
    } else {
        const [file] = await DiscordNative.fileManager.openFiles({
            filters: [
                { name: "Gif Collections", extensions: ["json"] },
                { name: "all", extensions: ["*"] }
            ]
        });

        if (file) {
            try {
                await importCollections(new TextDecoder().decode(file.data));
                if (showToast) toastSuccess();
            } catch (err) {
                console.error(err);
                // new Logger("SettingsSync").error(err);
                if (showToast) toastFailure(err);
            }
        }
    }
}



const toastSuccess = () => Toasts.show({
    type: Toasts.Type.SUCCESS,
    message: "Settings successfully imported.",
    id: Toasts.genId()
});

const toastFailure = (err: any) => Toasts.show({
    type: Toasts.Type.FAILURE,
    message: `Failed to import settings: ${String(err)}`,
    id: Toasts.genId()
});
