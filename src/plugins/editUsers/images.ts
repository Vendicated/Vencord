/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";
import { React, useCallback } from "@webpack/common";

export type ImageKind = "avatar" | "banner";
export type UserImages = Partial<Record<ImageKind, Blob>>;
export type ImageChanges = Partial<Record<ImageKind, Blob | null>>;

export const imageTypes = "image/png,image/jpeg,image/gif,image/webp,image/avif";
const maxImageSize = 10 * 1024 * 1024;
const dataUrlPattern = /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/;
const imageKinds = ["avatar", "banner"] as const;
const logger = new Logger("EditUsers");
let store: DataStore.UseStore;
let knownUsers: Promise<Set<string>>;

interface ActiveImages {
    listeners: Set<() => void>;
    urls: Partial<Record<ImageKind, string>>;
    request?: Promise<void>;
}

const activeImages = new Map<string, ActiveImages>();

function getStore() {
    return store ??= DataStore.createStore(
        IS_REPORTER ? "VencordEditUsersReporter" : "VencordEditUsers",
        "images"
    );
}

export function loadImageKeys() {
    return knownUsers ??= DataStore.keys<string>(getStore())
        .then(keys => new Set(keys))
        .catch(error => {
            logger.error("Could not read saved image keys", error);
            return new Set<string>();
        });
}

export function getImages(userId: string) {
    return DataStore.get<UserImages>(userId, getStore());
}

function setActiveImages(entry: ActiveImages, images?: UserImages, changed: readonly ImageKind[] = imageKinds) {
    const previous: string[] = [];
    for (const kind of changed) {
        const oldUrl = entry.urls[kind];
        const blob = images?.[kind];
        if (oldUrl) {
            previous.push(oldUrl);
        }
        entry.urls[kind] = blob ? URL.createObjectURL(blob) : undefined;
    }

    for (const listener of entry.listeners) {
        listener();
    }
    for (const url of previous) {
        URL.revokeObjectURL(url);
    }
}

function subscribeToImages(userId: string, listener: () => void) {
    let entry = activeImages.get(userId);
    if (!entry) {
        entry = { listeners: new Set(), urls: {} };
        activeImages.set(userId, entry);

        const active = entry;
        const request = loadImageKeys()
            .then(keys => keys.has(userId) ? getImages(userId) : undefined)
            .then(images => {
                if (activeImages.get(userId) === active && active.request === request) {
                    active.request = undefined;
                    setActiveImages(active, images);
                }
            })
            .catch(error => logger.error("Could not load user images", error));
        entry.request = request;
    }

    const active = entry;
    active.listeners.add(listener);
    return () => {
        active.listeners.delete(listener);
        if (!active.listeners.size) {
            activeImages.delete(userId);
            setActiveImages(active);
        }
    };
}

export function useLocalImage(userId: string | undefined, kind: ImageKind) {
    const subscribe = useCallback(
        (listener: () => void) => userId ? subscribeToImages(userId, listener) : () => {},
        [userId]
    );
    const getSnapshot = () => userId ? activeImages.get(userId)?.urls[kind] : undefined;
    return React.useSyncExternalStore(subscribe, getSnapshot);
}

export async function saveImageChanges(changes: ReadonlyMap<string, ImageChanges>) {
    const users = await loadImageKeys();
    const results = new Map<string, UserImages>();
    await getStore()("readwrite", objectStore => {
        for (const [userId, change] of changes) {
            const request = objectStore.get(userId);
            request.onsuccess = () => {
                const images: UserImages = request.result ?? {};
                for (const kind of imageKinds) {
                    const blob = change[kind];
                    if (blob === null) {
                        delete images[kind];
                    } else if (blob) {
                        images[kind] = blob;
                    }
                }

                if (images.avatar || images.banner) {
                    objectStore.put(images, userId);
                } else {
                    objectStore.delete(userId);
                }
                results.set(userId, images);
            };
        }
        return DataStore.promisifyRequest(objectStore.transaction);
    });

    for (const [userId, images] of results) {
        if (images.avatar || images.banner) {
            users.add(userId);
        } else {
            users.delete(userId);
        }

        const active = activeImages.get(userId);
        if (active) {
            const changed = active.request ? imageKinds : imageKinds.filter(kind => changes.get(userId)?.[kind] !== undefined);
            active.request = undefined;
            setActiveImages(active, images, changed);
        }
    }
}

export async function validateImage(blob: Blob) {
    if (!imageTypes.split(",").includes(blob.type) || !blob.size) {
        throw new Error("Choose a PNG, JPEG, GIF, WebP, or AVIF image.");
    }
    if (blob.size > maxImageSize) {
        throw new Error("Images must be 10 MB or smaller.");
    }

    const src = URL.createObjectURL(blob);
    try {
        const image = new Image();
        image.src = src;
        await image.decode();
    } catch {
        throw new Error("The selected file could not be decoded as an image.");
    } finally {
        URL.revokeObjectURL(src);
    }
}

export async function exportImages(kind: ImageKind) {
    const keys = await DataStore.keys<string>(getStore());
    const backup: Record<string, string> = {};
    for (const userId of keys) {
        const image = (await getImages(userId))?.[kind];
        if (image) {
            backup[userId] = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(image);
            });
        }
    }

    return new File([JSON.stringify(backup)], `edit-users-${kind}s.json`, { type: "application/json" });
}

export async function importImages(file: File, kind: ImageKind) {
    const backup: unknown = JSON.parse(await file.text());
    if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
        throw new Error("The backup must be a JSON object mapping user IDs to images.");
    }

    const changes = new Map<string, ImageChanges>();
    for (const [userId, data] of Object.entries(backup)) {
        if (!/^\d{17,20}$/.test(userId) || typeof data !== "string" || !dataUrlPattern.test(data)) {
            throw new Error("The backup contains an invalid user ID or image URL.");
        }
        const encodedImageSize = data.length - data.indexOf(",") - 1;
        if (encodedImageSize > Math.ceil(maxImageSize / 3) * 4) {
            throw new Error("Images must be 10 MB or smaller.");
        }
        const response = await fetch(data);
        const image = await response.blob();
        await validateImage(image);
        changes.set(userId, { [kind]: image });
    }

    await saveImageChanges(changes);
    return changes.size;
}
