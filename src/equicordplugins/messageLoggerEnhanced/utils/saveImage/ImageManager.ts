/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
    createStore,
    del,
    get,
    keys,
    set,
} from "@api/DataStore";

import { Flogger, Native } from "../..";
import { DEFAULT_IMAGE_CACHE_DIR } from "../constants";

const ImageStore = createStore("MessageLoggerImageData", "MessageLoggerImageStore");

interface IDBSavedImages { attachmentId: string, path: string; }
let idbSavedImages: IDBSavedImages[] = [];
(async () => {
    try {
        idbSavedImages = (await keys(ImageStore))
            .map(m => {
                const str = m.toString();
                if (!str.startsWith(DEFAULT_IMAGE_CACHE_DIR)) return null;
                return { attachmentId: str.split("/")?.[1]?.split(".")?.[0], path: str };
            })
            .filter(Boolean) as IDBSavedImages[];
    } catch (err) {
        Flogger.error("Failed to get idb images", err);
    }
})();

export async function getImage(attachmentId: string, fileExt?: string | null): Promise<any> {
    // for people who have access to native api but some images are still in idb
    // also for people who dont have native api
    const idbPath = idbSavedImages.find(m => m.attachmentId === attachmentId)?.path;
    if (idbPath)
        return get(idbPath, ImageStore);

    if (IS_WEB) return null;

    return await Native.getImageNative(attachmentId);
}

// file name shouldnt have any query param shinanigans
export async function writeImage(imageCacheDir: string, filename: string, content: Uint8Array): Promise<void> {
    if (IS_WEB) {
        const path = `${imageCacheDir}/${filename}`;
        idbSavedImages.push({ attachmentId: filename.split(".")?.[0], path });
        return set(path, content, ImageStore);
    }

    Native.writeImageNative(filename, content);
}

export async function deleteImage(attachmentId: string): Promise<void> {
    const idbPath = idbSavedImages.find(m => m.attachmentId === attachmentId)?.path;
    if (idbPath)
        return await del(idbPath, ImageStore);


    if (IS_WEB) return;

    await Native.deleteFileNative(attachmentId);
}
