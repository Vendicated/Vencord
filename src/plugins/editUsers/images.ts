/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { User } from "@vencord/discord-types";
import { React, useCallback } from "@webpack/common";

import { logger, settings } from "./data";

export type ImageKind = "avatar" | "banner";
export type UserImages = Partial<Record<ImageKind, Blob>>;
export type ImageChanges = Partial<Record<ImageKind, Blob | null>>;

export const imageTypes = "image/png,image/jpeg,image/gif,image/webp,image/avif";
const maxImageSize = 10 * 1024 * 1024;
const dataUrlPattern = /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/;
const imageKinds = ["avatar", "banner"] as const;
let store: DataStore.UseStore;
let loadingImages: Promise<void>;

interface SavedImage {
    blob: Blob;
    url?: string;
}

const savedImages = new Map<string, Partial<Record<ImageKind, SavedImage>>>();
const imageListeners = new Map<string, Set<() => void>>();

function getStore() {
    return store ??= DataStore.createStore(
        IS_REPORTER ? "VencordEditUsersReporter" : "VencordEditUsers",
        "images"
    );
}

export function loadImages() {
    return loadingImages ??= DataStore.entries<string, UserImages>(getStore())
        .then(entries => {
            for (const [userId, images] of entries) {
                updateImages(userId, images);
            }
        })
        .catch(error => logger.error("Could not load user images", error));
}

export function getImages(userId: string) {
    return DataStore.get<UserImages>(userId, getStore());
}

function updateImages(userId: string, changes: ImageChanges) {
    const images = savedImages.get(userId) ?? {};
    for (const kind of imageKinds) {
        const blob = changes[kind];
        if (blob === undefined) {
            continue;
        }

        const previous = images[kind]?.url;
        if (previous) {
            URL.revokeObjectURL(previous);
        }
        if (blob) {
            images[kind] = { blob };
        } else {
            delete images[kind];
        }
    }

    if (images.avatar || images.banner) {
        savedImages.set(userId, images);
    } else {
        savedImages.delete(userId);
    }

    imageListeners.get(userId)?.forEach(listener => listener());
}

export function getLocalImage(userId: string | undefined, kind: ImageKind) {
    const image = userId && savedImages.get(userId)?.[kind];
    if (image) {
        return image.url ??= URL.createObjectURL(image.blob);
    }
}

export function useLocalImage(userId: string | undefined, kind: ImageKind) {
    const subscribe = useCallback((listener: () => void) => {
        if (!userId) {
            return () => {};
        }

        const listeners = imageListeners.get(userId) ?? new Set<() => void>();
        imageListeners.set(userId, listeners);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
            if (listeners.size === 0) {
                imageListeners.delete(userId);
            }
        };
    }, [userId]);

    return React.useSyncExternalStore(subscribe, () => getLocalImage(userId, kind));
}

export function useUserAvatarURL(user: User | undefined, guildId?: string | null, size?: number, canAnimate?: boolean) {
    settings.use(["users"]);
    useLocalImage(user?.id, "avatar");
    return user?.getAvatarURL(guildId, size, canAnimate);
}

export async function saveImageChanges(changes: ReadonlyMap<string, ImageChanges>) {
    await loadImages();
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
            };
        }
        return DataStore.promisifyRequest(objectStore.transaction);
    });

    for (const [userId, change] of changes) {
        updateImages(userId, change);
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

type BackupEntry = Partial<Record<ImageKind, string>>;

export async function exportImages() {
    const keys = await DataStore.keys<string>(getStore());
    const backup: Record<string, BackupEntry> = {};
    for (const userId of keys) {
        const images = await getImages(userId);
        const entry: BackupEntry = {};
        for (const kind of imageKinds) {
            const image = images?.[kind];
            if (!image) {
                continue;
            }

            entry[kind] = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(image);
            });
        }
        if (entry.avatar || entry.banner) {
            backup[userId] = entry;
        }
    }

    return new File([JSON.stringify(backup)], "edit-users-images.json", { type: "application/json" });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

async function readBackupImage(data: unknown) {
    if (typeof data !== "string" || !dataUrlPattern.test(data)) {
        throw new Error("The backup contains an invalid image URL.");
    }
    const encodedImageSize = data.length - data.indexOf(",") - 1;
    if (encodedImageSize > Math.ceil(maxImageSize / 3) * 4) {
        throw new Error("Images must be 10 MB or smaller.");
    }
    const response = await fetch(data);
    const image = await response.blob();
    await validateImage(image);
    return image;
}

export async function importImages(file: File) {
    const backup: unknown = JSON.parse(await file.text());
    if (!isRecord(backup)) {
        throw new Error("The backup must be a JSON object mapping user IDs to images.");
    }

    const legacyKind = file.name.toLowerCase().startsWith("edit-users-banners") ? "banner" : "avatar";
    const changes = new Map<string, ImageChanges>();
    for (const [userId, data] of Object.entries(backup)) {
        if (!/^\d{17,20}$/.test(userId)) {
            throw new Error("The backup contains an invalid user ID.");
        }

        const entry = typeof data === "string" ? { [legacyKind]: data } : data;
        if (!isRecord(entry) || (!Object.hasOwn(entry, "avatar") && !Object.hasOwn(entry, "banner"))) {
            throw new Error("Each backup entry must contain an avatar or banner.");
        }

        const images: ImageChanges = {};
        for (const kind of imageKinds) {
            if (Object.hasOwn(entry, kind)) {
                images[kind] = await readBackupImage(entry[kind]);
            }
        }
        changes.set(userId, images);
    }

    await saveImageChanges(changes);
    return changes.size;
}
