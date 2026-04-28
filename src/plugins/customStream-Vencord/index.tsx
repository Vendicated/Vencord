/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

/*
 * Fixxed by zFrxncesck1
*/

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { ImageIcon } from "@components/Icons";
import { Alerts } from "@webpack/common";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, FluxDispatcher, Menu, React, showToast, Text, Toasts, UserStore, useState, useEffect, useRef } from "@webpack/common";

const PanelButton = findComponentByCodeLazy(".GREEN,positionKeyStemOverride:");
const ChannelStoreMod = findByPropsLazy("getChannel", "getDMFromUserId");
const SelectedChannelStoreMod = findByPropsLazy("getVoiceChannelId");
const TokenMod = findByPropsLazy("getToken");
const SuperPropsMod = findByPropsLazy("getSuperProperties");
const LocaleMod = findByPropsLazy("getLocale");

const DATASTORE_KEY_PROFILES = "CustomStreamTopQ_Profiles";
const DATASTORE_KEY_SLIDESHOW = "CustomStreamTopQ_Slideshow";
const DATASTORE_KEY_INDEX = "CustomStreamTopQ_SlideIndex";
const DATASTORE_KEY = "CustomStreamTopQ_ImageData";
const MAX_IMAGES_PER_PROFILE = 50;
const MAX_PROFILES = 5;
const DEFAULT_PROFILE_ID = "default";

interface Profile {
    id: string;
    name: string;
    dataUris: string[];
    currentIndex: number;
}

interface StoredProfile {
    id: string;
    name: string;
    dataUris?: string[];
    images?: { type: string; data: number[]; }[];
    currentIndex: number;
}

interface StoredProfilesData {
    version?: number;
    profiles: StoredProfile[];
    activeProfileId: string;
}

interface LegacySlideshowData {
    images: { type: string; data: number[]; }[];
}

let profiles: Map<string, Profile> = new Map();
let activeProfileId: string = DEFAULT_PROFILE_ID;

let cachedDataUris: string[] = [];
let currentSlideIndex = 0;
let lastSlideChangeTime = 0;
let isStreamActive = false;
let actualStreamImageUri: string | null = null;
let capturedStreamKey: string | null = null;
let instantTimer: ReturnType<typeof setTimeout> | null = null;
let randomQueue: number[] = [];
let userSelectedIndex: number | null = null;

function buildRandomQueue(): number[] {
    const len = cachedDataUris.length;
    if (len <= 1) return [];
    const indices = Array.from({ length: len }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.filter(i => i !== currentSlideIndex);
}

function getRandomNext(): number {
    randomQueue = randomQueue.filter(i => i < cachedDataUris.length);
    if (randomQueue.length === 0) randomQueue = buildRandomQueue();
    return randomQueue.shift() ?? 0;
}

function getActiveProfile(): Profile {
    let profile = profiles.get(activeProfileId);
    if (!profile) {
        profile = { id: DEFAULT_PROFILE_ID, name: "Default", dataUris: [], currentIndex: 0 };
        profiles.set(DEFAULT_PROFILE_ID, profile);
    }
    return profile;
}

function syncCacheWithActiveProfile() {
    const profile = getActiveProfile();
    cachedDataUris = profile.dataUris;
    currentSlideIndex = profile.currentIndex;
    randomQueue = [];
}

const imageChangeListeners = new Set<() => void>();

function notifyImageChange() {
    imageChangeListeners.forEach(fn => fn());
}

const settings = definePluginSettings({
    replaceEnabled: {
        type: OptionType.BOOLEAN,
        description: "Use custom preview instead of screen capture",
        default: true
    },
    slideshowEnabled: {
        type: OptionType.BOOLEAN,
        description: "Slideshow mode (switch images automatically on each preview upload)",
        default: false
    },
    slideshowRandom: {
        type: OptionType.BOOLEAN,
        description: "Random slide order",
        default: false
    },
    showInfoBadges: {
        type: OptionType.BOOLEAN,
        description: "Show info badges in modal (count, selected, timer)",
        default: true
    },
    showPanelButton: {
        type: OptionType.BOOLEAN,
        description: "Show button in user area (account panel)",
        default: false
    },
    instantSlideshow: {
        type: OptionType.BOOLEAN,
        description: "Instant slideshow: switch slides at the interval below",
        default: true
    },
    instantSlideshowInterval: {
        type: OptionType.NUMBER,
        description: "Instant slideshow interval in seconds (also used for preview bypass keep-alive)",
        default: 300
    },
    bypassPreviewToggle: {
        type: OptionType.BOOLEAN,
        description: "Force-send custom preview even when 'Show Stream Sreviews' toggle is OFF",
        default: true
    }
});

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function estimateSizeFromDataUri(uri: string): number {
    const comma = uri.indexOf(",");
    if (comma === -1) return 0;
    return Math.round((uri.length - comma - 1) * 0.75);
}

async function legacyBytesToDataUri(data: number[], type: string): Promise<string> {
    const blob = new Blob([new Uint8Array(data)], { type });
    return blobToDataUrl(blob);
}

async function saveProfilesToDataStore(): Promise<void> {
    const storedProfiles: StoredProfile[] = [];
    for (const [, profile] of profiles) {
        storedProfiles.push({
            id: profile.id,
            name: profile.name,
            dataUris: profile.dataUris,
            currentIndex: profile.currentIndex
        });
    }
    await DataStore.set(DATASTORE_KEY_PROFILES, {
        version: 2,
        profiles: storedProfiles,
        activeProfileId
    });
    syncCacheWithActiveProfile();
    notifyImageChange();
}

async function loadProfilesFromDataStore(): Promise<void> {
    try {
        const data: StoredProfilesData | undefined = await DataStore.get(DATASTORE_KEY_PROFILES);

        if (data?.profiles?.length) {
            profiles.clear();
            for (const stored of data.profiles) {
                let dataUris: string[];

                if (stored.dataUris) {
                    dataUris = stored.dataUris;
                } else if (stored.images?.length) {
                    dataUris = [];
                    for (const img of stored.images) {
                        dataUris.push(await legacyBytesToDataUri(img.data, img.type));
                    }
                } else {
                    dataUris = [];
                }

                profiles.set(stored.id, {
                    id: stored.id,
                    name: stored.name,
                    dataUris,
                    currentIndex: stored.currentIndex
                });
            }
            activeProfileId = data.activeProfileId || DEFAULT_PROFILE_ID;

            if (!data.version || data.version < 2) {
                await saveProfilesToDataStore();
            }
        } else {
            const oldData: LegacySlideshowData | undefined = await DataStore.get(DATASTORE_KEY_SLIDESHOW);
            if (oldData?.images?.length) {
                const dataUris: string[] = [];
                for (const img of oldData.images) {
                    dataUris.push(await legacyBytesToDataUri(img.data, img.type));
                }
                const oldIndex: number = (await DataStore.get(DATASTORE_KEY_INDEX)) ?? 0;
                profiles.set(DEFAULT_PROFILE_ID, {
                    id: DEFAULT_PROFILE_ID,
                    name: "Default",
                    dataUris,
                    currentIndex: oldIndex
                });
                activeProfileId = DEFAULT_PROFILE_ID;
                await saveProfilesToDataStore();
                await DataStore.del(DATASTORE_KEY_SLIDESHOW);
                await DataStore.del(DATASTORE_KEY_INDEX);
                await DataStore.del(DATASTORE_KEY);
            } else {
                profiles.set(DEFAULT_PROFILE_ID, { id: DEFAULT_PROFILE_ID, name: "Default", dataUris: [], currentIndex: 0 });
                activeProfileId = DEFAULT_PROFILE_ID;
            }
        }

        syncCacheWithActiveProfile();
    } catch (error) {
        console.error("[CustomStreamTopQ] Error loading profiles:", error);
        profiles.set(DEFAULT_PROFILE_ID, { id: DEFAULT_PROFILE_ID, name: "Default", dataUris: [], currentIndex: 0 });
        activeProfileId = DEFAULT_PROFILE_ID;
    }
}

function createProfile(name: string): Profile | null {
    if (profiles.size >= MAX_PROFILES) return null;
    const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const profile: Profile = { id, name, dataUris: [], currentIndex: 0 };
    profiles.set(id, profile);
    return profile;
}

function deleteProfile(profileId: string): boolean {
    const profile = profiles.get(profileId);
    if (!profile) return false;
    if (profile.dataUris.length > 0) return false;
    if (profileId === DEFAULT_PROFILE_ID) return false;
    profiles.delete(profileId);
    if (activeProfileId === profileId) {
        activeProfileId = DEFAULT_PROFILE_ID;
        syncCacheWithActiveProfile();
    }
    return true;
}

function renameProfile(profileId: string, newName: string): boolean {
    const profile = profiles.get(profileId);
    if (!profile) return false;
    profile.name = newName;
    return true;
}

function setActiveProfile(profileId: string): boolean {
    if (!profiles.has(profileId)) return false;
    activeProfileId = profileId;
    syncCacheWithActiveProfile();
    notifyImageChange();
    return true;
}

function getProfileList(): Profile[] {
    return Array.from(profiles.values());
}

async function saveSlideIndex(index: number): Promise<void> {
    const profile = getActiveProfile();
    profile.currentIndex = index;
    currentSlideIndex = index;
    await saveProfilesToDataStore();
}

async function deleteAllImages(): Promise<void> {
    const profile = getActiveProfile();
    profile.dataUris = [];
    profile.currentIndex = 0;
    syncCacheWithActiveProfile();
    await saveProfilesToDataStore();
}

async function deleteImageAtIndex(index: number): Promise<void> {
    const profile = getActiveProfile();
    if (index < 0 || index >= profile.dataUris.length) return;
    profile.dataUris.splice(index, 1);
    if (profile.dataUris.length === 0) {
        profile.currentIndex = 0;
    } else if (index < profile.currentIndex) {
        profile.currentIndex--;
    } else if (index === profile.currentIndex) {
        profile.currentIndex = Math.min(profile.currentIndex, profile.dataUris.length - 1);
    }
    syncCacheWithActiveProfile();
    await saveProfilesToDataStore();
}

async function moveImage(fromIndex: number, toIndex: number): Promise<void> {
    const profile = getActiveProfile();
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= profile.dataUris.length) return;
    if (toIndex < 0 || toIndex >= profile.dataUris.length) return;
    [profile.dataUris[fromIndex], profile.dataUris[toIndex]] = [profile.dataUris[toIndex], profile.dataUris[fromIndex]];
    if (profile.currentIndex === fromIndex) profile.currentIndex = toIndex;
    else if (profile.currentIndex === toIndex) profile.currentIndex = fromIndex;
    syncCacheWithActiveProfile();
    await saveProfilesToDataStore();
}

async function addImageUri(dataUri: string): Promise<void> {
    const profile = getActiveProfile();
    profile.dataUris.push(dataUri);
    syncCacheWithActiveProfile();
    await saveProfilesToDataStore();
}

function getImageCount(): number {
    return cachedDataUris.length;
}

async function processImage(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            URL.revokeObjectURL(url);
            const targetWidth = 1280;
            const targetHeight = 720;
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (targetWidth - scaledWidth) / 2;
            const y = (targetHeight - scaledHeight) / 2;
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            canvas.toBlob(newBlob => {
                if (newBlob) {
                    blobToDataUrl(newBlob).then(resolve).catch(reject);
                } else {
                    reject(new Error("Failed to convert image"));
                }
            }, "image/jpeg", 0.7);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
        };

        img.src = url;
    });
}

function ImagePickerModal({ rootProps }: { rootProps: any; }) {
    const initialSettingsRef = useRef({
        enabled: settings.store.replaceEnabled,
        slideshowEnabled: settings.store.slideshowEnabled,
        slideshowRandom: settings.store.slideshowRandom,
        activeProfileId: activeProfileId
    });
    const savedRef = useRef(false);

    const [images, setImages] = useState<string[]>([]);
    const [imageSizes, setImageSizes] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [pendingIndex, setPendingIndex] = useState(currentSlideIndex);
    const [pluginEnabled, setPluginEnabled] = useState(settings.store.replaceEnabled);
    const [slideshowOn, setSlideshowOn] = useState(settings.store.slideshowEnabled);
    const [randomOn, setRandomOn] = useState(settings.store.slideshowRandom);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [timerSeconds, setTimerSeconds] = useState(() => lastSlideChangeTime > 0 ? Math.floor((Date.now() - lastSlideChangeTime) / 1000) : 0);
    const [streamActive, setStreamActive] = useState(isStreamActive);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const [profileList, setProfileList] = useState<Profile[]>(getProfileList());
    const [currentProfileId, setCurrentProfileId] = useState(activeProfileId);
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState("");
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingProfileName, setEditingProfileName] = useState("");

    useEffect(() => {
        return () => {
            if (!savedRef.current) {
                const init = initialSettingsRef.current;
                settings.store.replaceEnabled = init.enabled;
                settings.store.slideshowEnabled = init.slideshowEnabled;
                settings.store.slideshowRandom = init.slideshowRandom;
                setActiveProfile(init.activeProfileId);
            }
        };
    }, []);

    const loadImages = () => {
        setIsLoading(true);
        const profile = profiles.get(currentProfileId) || getActiveProfile();
        const uris = profile.dataUris.slice();
        const sizes = uris.map(estimateSizeFromDataUri);
        setImages(uris);
        setImageSizes(sizes);
        setIsLoading(false);
    };

    useEffect(() => {
        loadImages();
    }, [currentProfileId]);

    useEffect(() => {
        const timerInterval = setInterval(() => {
            setStreamActive(isStreamActive);
            if (lastSlideChangeTime > 0 && isStreamActive) {
                setTimerSeconds(Math.floor((Date.now() - lastSlideChangeTime) / 1000));
            }
        }, 1000);
        return () => clearInterval(timerInterval);
    }, []);

    const handleProfileSwitch = async (profileId: string) => {
        setActiveProfile(profileId);
        setCurrentProfileId(profileId);
        const profile = profiles.get(profileId);
        if (profile) {
            currentSlideIndex = profile.currentIndex;
            userSelectedIndex = profile.currentIndex;
            randomQueue = [];
            setPendingIndex(profile.currentIndex);
            forceUploadPreview();
        }
    };

    const handleCreateProfile = async () => {
        if (!newProfileName.trim()) {
            setError("Enter profile name");
            return;
        }
        if (newProfileName.trim().length > 40) {
            setError("Profile name too long (max 40 characters)");
            return;
        }
        if (profiles.size >= MAX_PROFILES) {
            setError(`Maximum ${MAX_PROFILES} profiles allowed`);
            return;
        }
        const profile = createProfile(newProfileName.trim());
        if (!profile) {
            setError(`Maximum ${MAX_PROFILES} profiles allowed`);
            return;
        }
        await saveProfilesToDataStore();
        setProfileList(getProfileList());
        setNewProfileName("");
        setIsCreatingProfile(false);
        handleProfileSwitch(profile.id);
        showToast(`Profile "${profile.name}" created`, Toasts.Type.SUCCESS);
    };

    const handleDeleteProfile = async (profileId: string) => {
        const profile = profiles.get(profileId);
        if (!profile) return;
        if (profile.dataUris.length > 0) {
            setError("Delete all images first!");
            return;
        }
        if (profileId === DEFAULT_PROFILE_ID) {
            setError("Cannot delete default profile");
            return;
        }
        Alerts.show({
            title: `Delete profile "${profile.name}"?`,
            body: "This action cannot be undone.",
            confirmText: "Delete",
            cancelText: "Cancel",
            confirmColor: "red",
            onConfirm: async () => {
                deleteProfile(profileId);
                await saveProfilesToDataStore();
                setProfileList(getProfileList());
                if (currentProfileId === profileId) handleProfileSwitch(DEFAULT_PROFILE_ID);
                showToast("Profile deleted", Toasts.Type.SUCCESS);
            }
        });
    };

    const handleRenameProfile = async (profileId: string) => {
        if (!editingProfileName.trim()) {
            setEditingProfileId(null);
            return;
        }
        if (editingProfileName.trim().length > 40) {
            setError("Profile name too long (max 40 characters)");
            return;
        }
        renameProfile(profileId, editingProfileName.trim());
        await saveProfilesToDataStore();
        setProfileList(getProfileList());
        setEditingProfileId(null);
        showToast("Profile renamed", Toasts.Type.SUCCESS);
    };

    const handleDroppedFiles = async (files: FileList | File[]) => {
        const profile = profiles.get(currentProfileId) || getActiveProfile();
        const remaining = MAX_IMAGES_PER_PROFILE - profile.dataUris.length;
        if (remaining <= 0) {
            setError(`Limit of ${MAX_IMAGES_PER_PROFILE} images reached!`);
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            let added = 0;
            for (const file of files) {
                if (added >= remaining) {
                    setError(`Added ${added}. Limit of ${MAX_IMAGES_PER_PROFILE} reached!`);
                    break;
                }
                if (!file.type.startsWith("image/") || file.type === "image/gif") continue;
                if (file.size > 8 * 1024 * 1024) continue;
                const dataUri = await processImage(file);
                await addImageUri(dataUri);
                added++;
            }
            loadImages();
            if (added > 0) {
                showToast(`Added: ${added}`, Toasts.Type.SUCCESS);
                forceUploadPreview();
            }
        } catch {
            setError("File processing error");
        }
        setIsLoading(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedIndex === null && e.dataTransfer.types.includes("Files")) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            setIsDragging(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) await handleDroppedFiles(e.dataTransfer.files);
    };

    const handleFileSelect = (multiple: boolean) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/webp";
        input.multiple = multiple;
        input.onchange = async (e: any) => {
            const files = e.target.files;
            if (!files?.length) return;
            const profile = profiles.get(currentProfileId) || getActiveProfile();
            const remaining = MAX_IMAGES_PER_PROFILE - profile.dataUris.length;
            if (remaining <= 0) {
                setError(`Limit of ${MAX_IMAGES_PER_PROFILE} images reached!`);
                return;
            }
            setIsLoading(true);
            setError("");
            try {
                let added = 0;
                for (const file of files) {
                    if (added >= remaining) {
                        setError(`Added ${added}. Limit of ${MAX_IMAGES_PER_PROFILE} reached!`);
                        break;
                    }
                    if (file.type === "image/gif" || file.type.startsWith("video/")) continue;
                    if (file.size > 8 * 1024 * 1024) continue;
                    const dataUri = await processImage(file);
                    await addImageUri(dataUri);
                    added++;
                }
                loadImages();
                if (added > 0) {
                    showToast(`Added: ${added}`, Toasts.Type.SUCCESS);
                    forceUploadPreview();
                }
            } catch {
                setError("File processing error");
            }
            setIsLoading(false);
        };
        input.click();
    };

    const handleDelete = async (index: number) => {
        await deleteImageAtIndex(index);
        const profile = profiles.get(currentProfileId) || getActiveProfile();
        let newIndex = pendingIndex;
        if (profile.dataUris.length === 0) newIndex = 0;
        else if (pendingIndex >= profile.dataUris.length) newIndex = profile.dataUris.length - 1;
        setPendingIndex(newIndex);
        currentSlideIndex = newIndex;
        loadImages();
        setProfileList(getProfileList());
        if (profile.dataUris.length > 0) { userSelectedIndex = currentSlideIndex; forceUploadPreview(); }
        showToast("Deleted", Toasts.Type.MESSAGE);
    };

    const handleClearAll = async () => {
        const profile = profiles.get(currentProfileId);
        if (!profile || profile.dataUris.length === 0) return;
        Alerts.show({
            title: `Delete all images from "${profile.name}"?`,
            body: `Are you sure you want to delete all ${images.length} images? This action cannot be undone.`,
            confirmText: "Delete All",
            cancelText: "Cancel",
            confirmColor: "red",
            onConfirm: async () => {
                await deleteAllImages();
                userSelectedIndex = null;
                randomQueue = [];
                setImages([]);
                setPendingIndex(0);
                setProfileList(getProfileList());
                showToast("All deleted", Toasts.Type.MESSAGE);
            }
        });
    };

    const handleSelectCurrent = (index: number) => {
        setPendingIndex(index);
        currentSlideIndex = index;
        userSelectedIndex = index;
        getActiveProfile().currentIndex = index;
        randomQueue = [];
        forceUploadPreview();
    };

    const togglePlugin = () => setPluginEnabled(v => !v);
    const toggleSlideshow = () => setSlideshowOn(v => !v);
    const toggleRandom = () => setRandomOn(v => !v);

    const handleExport = () => {
        const data: StoredProfilesData = {
            version: 2,
            profiles: Array.from(profiles.values()).map(p => ({
                id: p.id,
                name: p.name,
                dataUris: p.dataUris,
                currentIndex: p.currentIndex
            })),
            activeProfileId
        };
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `customstream-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Backup exported!", Toasts.Type.SUCCESS);
    };

    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data: StoredProfilesData = JSON.parse(text);
                if (!data.profiles || !Array.isArray(data.profiles)) {
                    setError("Invalid backup file");
                    return;
                }
                Alerts.show({
                    title: "Import Backup?",
                    body: `This will replace ALL current profiles with ${data.profiles.length} profile(s) from the backup. This cannot be undone.`,
                    confirmText: "Import",
                    cancelText: "Cancel",
                    onConfirm: async () => {
                        profiles.clear();
                        for (const stored of data.profiles) {
                            profiles.set(stored.id, {
                                id: stored.id,
                                name: stored.name,
                                dataUris: stored.dataUris ?? [],
                                currentIndex: stored.currentIndex
                            });
                        }
                        if (!profiles.has(DEFAULT_PROFILE_ID)) {
                            profiles.set(DEFAULT_PROFILE_ID, { id: DEFAULT_PROFILE_ID, name: "Default", dataUris: [], currentIndex: 0 });
                        }
                        activeProfileId = data.activeProfileId && profiles.has(data.activeProfileId) ? data.activeProfileId : DEFAULT_PROFILE_ID;
                        await saveProfilesToDataStore();
                        syncCacheWithActiveProfile();
                        setCurrentProfileId(activeProfileId);
                        setProfileList(getProfileList());
                        setPendingIndex(getActiveProfile().currentIndex);
                        loadImages();
                        showToast("Backup imported!", Toasts.Type.SUCCESS);
                    }
                });
            } catch {
                setError("Failed to read backup file");
            }
        };
        input.click();
    };

    const handleReset = () => {
        Alerts.show({
            title: "Reset All Data?",
            body: "This will permanently delete ALL profiles and images. This cannot be undone.",
            confirmText: "Reset Everything",
            cancelText: "Cancel",
            confirmColor: "red",
            onConfirm: async () => {
                profiles.clear();
                profiles.set(DEFAULT_PROFILE_ID, { id: DEFAULT_PROFILE_ID, name: "Default", dataUris: [], currentIndex: 0 });
                activeProfileId = DEFAULT_PROFILE_ID;
                cachedDataUris = [];
                currentSlideIndex = 0;
                randomQueue = [];
                userSelectedIndex = null;
                await saveProfilesToDataStore();
                setCurrentProfileId(DEFAULT_PROFILE_ID);
                setProfileList(getProfileList());
                setImages([]);
                setPendingIndex(0);
                notifyImageChange();
                showToast("Reset complete", Toasts.Type.MESSAGE);
            }
        });
    };

    const handleSave = async () => {
        settings.store.replaceEnabled = pluginEnabled;
        settings.store.slideshowEnabled = slideshowOn;
        settings.store.slideshowRandom = randomOn;
        userSelectedIndex = pendingIndex;
        randomQueue = [];
        await saveSlideIndex(pendingIndex);
        savedRef.current = true;
        notifyImageChange();
        forceUploadPreview();
        showToast("Saved!", Toasts.Type.SUCCESS);
        rootProps.onClose();
    };

    const handleCancel = () => rootProps.onClose();

    const handleImageDragStart = (e: React.DragEvent, index: number) => {
        e.stopPropagation();
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleImageDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index);
    };

    const handleImageDragLeave = (e: React.DragEvent) => {
        e.stopPropagation();
        setDragOverIndex(null);
    };

    const handleImageDrop = async (e: React.DragEvent, toIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedIndex !== null && draggedIndex !== toIndex) {
            let newPendingIndex = pendingIndex;
            if (pendingIndex === draggedIndex) newPendingIndex = toIndex;
            else if (pendingIndex === toIndex) newPendingIndex = draggedIndex;
            await moveImage(draggedIndex, toIndex);
            setPendingIndex(newPendingIndex);
            currentSlideIndex = newPendingIndex;
            loadImages();
            showToast(`Moved: #${draggedIndex + 1} → #${toIndex + 1}`, Toasts.Type.SUCCESS);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleImageDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const getNextIndex = () => {
        if (images.length <= 1 || !slideshowOn) return -1;
        if (randomOn) return -1;
        return (pendingIndex + 1) % images.length;
    };

    const nextIndex = getNextIndex();

    return (
        <ModalRoot {...rootProps} size={ModalSize.LARGE}>

            {previewImage && (
                <div
                    onClick={() => setPreviewImage(null)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.95)",
                        zIndex: 10000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "zoom-out",
                        padding: "40px"
                    }}
                >
                    <img
                        src={previewImage}
                        alt="Preview"
                        style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            borderRadius: "8px",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
                        }}
                    />
                    <div style={{ position: "absolute", top: "20px", right: "20px", color: "white", fontSize: "14px", opacity: 0.7 }}>
                        Click to close
                    </div>
                    <div style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: "white",
                        fontSize: "13px",
                        backgroundColor: "rgba(0,0,0,0.6)",
                        padding: "8px 16px",
                        borderRadius: "8px"
                    }}>
                        📐 1280×720 (16:9) — Stream preview size
                    </div>
                </div>
            )}

            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>
                    Stream Preview
                </Text>
                <ModalCloseButton onClick={handleCancel} />
            </ModalHeader>
            <ModalContent>
                <div
                    style={{ padding: "20px", position: "relative" }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >

                    {isDragging && draggedIndex === null && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            style={{
                                position: "absolute",
                                top: "8px",
                                left: "8px",
                                right: "8px",
                                bottom: "400px",
                                backgroundColor: "rgba(88, 101, 242, 0.95)",
                                borderRadius: "12px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 1000,
                                border: "3px dashed rgba(255,255,255,0.5)",
                                pointerEvents: "auto",
                                backdropFilter: "blur(8px)"
                            }}>
                            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📥</div>
                            <Text variant="heading-lg/bold" style={{ color: "white", marginBottom: "4px" }}>
                                Drop to upload
                            </Text>
                            <Text variant="text-sm/normal" style={{ color: "rgba(255,255,255,0.7)" }}>
                                Supports PNG, JPEG, WebP
                            </Text>
                        </div>
                    )}

                    <div
                        onClick={togglePlugin}
                        style={{
                            padding: "14px 20px",
                            borderRadius: "10px",
                            marginBottom: "16px",
                            cursor: "pointer",
                            backgroundColor: pluginEnabled ? "rgba(59, 165, 92, 0.9)" : "rgba(237, 66, 69, 0.9)",
                            color: "white",
                            fontWeight: "600",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            transition: "all 0.2s ease",
                            boxShadow: pluginEnabled ? "0 4px 12px rgba(59, 165, 92, 0.3)" : "0 4px 12px rgba(237, 66, 69, 0.3)"
                        }}
                    >
                        <span style={{ fontSize: "18px" }}>{pluginEnabled ? "✅" : "❌"}</span>
                        {pluginEnabled ? "REPLACEMENT ENABLED" : "REPLACEMENT DISABLED (default Discord)"}
                    </div>

                    <div style={{
                        marginBottom: "16px",
                        backgroundColor: "var(--background-secondary)",
                        borderRadius: "12px",
                        padding: "16px",
                        border: "1px solid var(--background-modifier-accent)"
                    }}>

                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "14px",
                            paddingBottom: "12px",
                            borderBottom: "1px solid var(--background-modifier-accent)"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "20px" }}>📁</span>
                                <Text variant="text-md/semibold" style={{ color: "#ffffff" }}>
                                    Profiles
                                </Text>
                                <span style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: "#ffffff",
                                    backgroundColor: "var(--brand-experiment)",
                                    padding: "3px 10px",
                                    borderRadius: "12px"
                                }}>
                                    {profileList.length}/{MAX_PROFILES}
                                </span>
                            </div>
                            {!isCreatingProfile && profileList.length < MAX_PROFILES && (
                                <button
                                    onClick={() => setIsCreatingProfile(true)}
                                    style={{
                                        background: "linear-gradient(135deg, #5865F2 0%, #7289da 100%)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "8px 14px",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        transition: "all 0.2s ease",
                                        boxShadow: "0 2px 8px rgba(88, 101, 242, 0.3)"
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                                        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(88, 101, 242, 0.4)";
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                                        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(88, 101, 242, 0.3)";
                                    }}
                                >
                                    <span style={{ fontSize: "14px" }}>+</span> New Profile
                                </button>
                            )}
                        </div>

                        {isCreatingProfile && (
                            <div style={{
                                display: "flex",
                                gap: "10px",
                                marginBottom: "14px",
                                padding: "14px",
                                backgroundColor: "var(--background-tertiary)",
                                borderRadius: "10px",
                                border: "1px solid rgba(88, 101, 242, 0.3)"
                            }}>
                                <input
                                    type="text"
                                    placeholder="Profile name..."
                                    value={newProfileName}
                                    onChange={e => setNewProfileName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") handleCreateProfile();
                                        if (e.key === "Escape") { setIsCreatingProfile(false); setNewProfileName(""); }
                                    }}
                                    autoFocus
                                    style={{
                                        flex: 1,
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid var(--background-modifier-accent)",
                                        backgroundColor: "var(--background-secondary)",
                                        color: "#ffffff",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                                <button onClick={handleCreateProfile} style={{ backgroundColor: "rgba(59, 165, 92, 0.9)", color: "white", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>✓</button>
                                <button onClick={() => { setIsCreatingProfile(false); setNewProfileName(""); }} style={{ backgroundColor: "rgba(237, 66, 69, 0.9)", color: "white", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>✕</button>
                            </div>
                        )}

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {profileList.map((profile: Profile) => {
                                const isActive = profile.id === currentProfileId;
                                const isEditing = editingProfileId === profile.id;
                                const canDelete = profile.id !== DEFAULT_PROFILE_ID && profile.dataUris.length === 0;

                                return (
                                    <div
                                        key={profile.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "8px 12px",
                                            borderRadius: "8px",
                                            backgroundColor: isActive ? "#5865F2" : "var(--background-secondary-alt)",
                                            background: isActive ? "linear-gradient(135deg, #5865F2 0%, #4752c4 100%)" : "var(--background-secondary-alt)",
                                            color: "#ffffff",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                            border: isActive ? "2px solid #5865F2" : "1px solid var(--background-modifier-accent)",
                                            boxShadow: isActive ? "0 3px 10px rgba(88, 101, 242, 0.4)" : "0 1px 4px rgba(0,0,0,0.1)",
                                            minWidth: "100px"
                                        }}
                                        onClick={() => !isEditing && handleProfileSwitch(profile.id)}
                                        onMouseEnter={e => {
                                            if (!isActive) {
                                                (e.currentTarget as HTMLElement).style.borderColor = "#5865F2";
                                                (e.currentTarget as HTMLElement).style.boxShadow = "0 3px 10px rgba(88, 101, 242, 0.25)";
                                                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--background-tertiary)";
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) {
                                                (e.currentTarget as HTMLElement).style.borderColor = "var(--background-modifier-accent)";
                                                (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.1)";
                                                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--background-secondary-alt)";
                                            }
                                        }}
                                    >
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editingProfileName}
                                                onChange={e => setEditingProfileName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") handleRenameProfile(profile.id);
                                                    if (e.key === "Escape") setEditingProfileId(null);
                                                }}
                                                onBlur={() => handleRenameProfile(profile.id)}
                                                autoFocus
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                    width: "80px",
                                                    padding: "4px 8px",
                                                    borderRadius: "4px",
                                                    border: "2px solid #5865F2",
                                                    backgroundColor: "var(--background-secondary)",
                                                    color: "#ffffff",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    outline: "none"
                                                }}
                                            />
                                        ) : (
                                            <>
                                                {isActive && <span style={{ fontSize: "12px", fontWeight: "bold" }}>✓</span>}
                                                {!isActive && <span style={{ fontSize: "12px" }}>📁</span>}
                                                <span style={{ fontWeight: "600", fontSize: "12px", letterSpacing: "0.2px", color: "#ffffff" }}>
                                                    {profile.name}
                                                </span>
                                                <span style={{
                                                    fontSize: "10px",
                                                    fontWeight: "700",
                                                    backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "var(--brand-experiment)",
                                                    color: "#ffffff",
                                                    padding: "2px 6px",
                                                    borderRadius: "6px",
                                                    minWidth: "20px",
                                                    textAlign: "center"
                                                }}>
                                                    {profile.dataUris.length}
                                                </span>
                                            </>
                                        )}

                                        {isActive && !isEditing && (
                                            <div style={{ display: "flex", gap: "6px", marginLeft: "6px", paddingLeft: "8px", borderLeft: "1px solid rgba(255,255,255,0.3)" }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingProfileId(profile.id); setEditingProfileName(profile.name); }}
                                                    style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: "6px", width: "28px", height: "28px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.3)"}
                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.15)"}
                                                    title="Rename"
                                                >✏️</button>
                                                {canDelete && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }}
                                                        style={{ backgroundColor: "rgba(237, 66, 69, 0.9)", color: "white", border: "none", borderRadius: "6px", width: "28px", height: "28px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
                                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(237, 66, 69, 1)"}
                                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(237, 66, 69, 0.9)"}
                                                        title="Delete profile (only if empty)"
                                                    >🗑️</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{
                            marginTop: "14px",
                            paddingTop: "12px",
                            borderTop: "1px solid var(--background-modifier-accent)",
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            <span style={{ fontSize: "14px" }}>💡</span>
                            <span>Click profile to select • Empty profiles can be deleted</span>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                        <div
                            onClick={toggleSlideshow}
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                backgroundColor: slideshowOn ? "rgba(88, 101, 242, 0.9)" : "rgba(79, 84, 92, 0.9)",
                                color: "white",
                                fontWeight: "600",
                                fontSize: "13px",
                                textAlign: "center",
                                transition: "all 0.2s ease",
                                boxShadow: slideshowOn ? "0 4px 12px rgba(88, 101, 242, 0.3)" : "none"
                            }}
                        >
                            🎞️ Slideshow: {slideshowOn ? "ON" : "OFF"}
                        </div>
                        <div
                            onClick={slideshowOn ? toggleRandom : undefined}
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: "8px",
                                cursor: slideshowOn ? "pointer" : "not-allowed",
                                backgroundColor: slideshowOn && randomOn ? "rgba(88, 101, 242, 0.9)" : "rgba(79, 84, 92, 0.9)",
                                color: "white",
                                fontWeight: "600",
                                fontSize: "13px",
                                textAlign: "center",
                                opacity: slideshowOn ? 1 : 0.5,
                                transition: "all 0.2s ease",
                                boxShadow: slideshowOn && randomOn ? "0 4px 12px rgba(88, 101, 242, 0.3)" : "none"
                            }}
                        >
                            🎲 Random: {randomOn ? "YES" : "NO"}
                        </div>
                    </div>

                    {settings.store.showInfoBadges && (
                        <div style={{
                            padding: "14px 18px",
                            backgroundColor: "var(--background-secondary)",
                            borderRadius: "10px",
                            marginBottom: "16px",
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "12px",
                            border: "1px solid var(--background-modifier-accent)"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", backgroundColor: "rgba(88, 101, 242, 0.15)", borderRadius: "8px", border: "1px solid rgba(88, 101, 242, 0.3)", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                                <span style={{ fontSize: "18px" }}>📁</span>
                                <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Profile</span>
                                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#5865F2" }}>
                                        {profiles.get(currentProfileId)?.name || "Default"}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", backgroundColor: "var(--background-tertiary)", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                                <span style={{ fontSize: "18px" }}>📊</span>
                                <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Images</span>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                                        <span style={{ fontSize: "20px", fontWeight: "800", color: "#5865F2" }}>{images.length}</span>
                                        <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)" }}>/{MAX_IMAGES_PER_PROFILE}</span>
                                    </div>
                                </div>
                            </div>

                            {images.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", backgroundColor: "rgba(88, 101, 242, 0.15)", borderRadius: "8px", border: "1px solid rgba(88, 101, 242, 0.3)", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                                    <span style={{ fontSize: "18px" }}>📍</span>
                                    <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Selected</span>
                                        <span style={{ fontSize: "16px", fontWeight: "700", color: "#5865F2" }}>#{pendingIndex + 1}</span>
                                    </div>
                                </div>
                            )}

                            {images.length > 1 && slideshowOn && pluginEnabled && (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", backgroundColor: streamActive ? "rgba(59, 165, 92, 0.15)" : "var(--background-tertiary)", borderRadius: "8px", border: streamActive ? "1px solid rgba(59, 165, 92, 0.3)" : "none", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                                    <span style={{ fontSize: "18px" }}>{streamActive ? "🟢" : "⚫"}</span>
                                    <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Slideshow</span>
                                        <span style={{ fontSize: "14px", fontWeight: "600", color: streamActive ? "#3ba55c" : "var(--text-muted)" }}>
                                            {settings.store.instantSlideshow ? `${settings.store.instantSlideshowInterval ?? 10}s` : "auto"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {images.length > 0 && pluginEnabled && streamActive && lastSlideChangeTime > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", backgroundColor: "rgba(88, 101, 242, 0.15)", borderRadius: "8px", border: "1px solid rgba(88, 101, 242, 0.3)", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                                    <span style={{ fontSize: "18px" }}>⏱️</span>
                                    <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Timer</span>
                                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                                            <span style={{ fontSize: "14px", fontWeight: "700", color: "#5865F2" }}>{formatTime(timerSeconds)}</span>
                                            <span style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)" }}>ago</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                        <Button onClick={() => handleFileSelect(false)} disabled={isLoading || images.length >= MAX_IMAGES_PER_PROFILE} style={{ padding: "10px 16px" }}>
                            {isLoading ? "⏳..." : "📁 Add Image"}
                        </Button>
                        <Button onClick={() => handleFileSelect(true)} disabled={isLoading || images.length >= MAX_IMAGES_PER_PROFILE} style={{ padding: "10px 16px" }}>
                            📁+ Multiple
                        </Button>
                        <Button color={Button.Colors.RED} onClick={handleClearAll} disabled={images.length === 0} style={{ padding: "10px 16px" }}>
                            🗑️ Delete All
                        </Button>
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
                        <button
                            onClick={handleExport}
                            style={{
                                padding: "9px 16px",
                                borderRadius: "8px",
                                border: "none",
                                cursor: "pointer",
                                background: "linear-gradient(135deg, #5865F2 0%, #4752c4 100%)",
                                color: "white",
                                fontWeight: "600",
                                fontSize: "13px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 2px 8px rgba(88, 101, 242, 0.35)",
                                transition: "opacity 0.15s ease"
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.82"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                        >
                            ⬆️ Export Backup
                        </button>
                        <button
                            onClick={handleImport}
                            style={{
                                padding: "9px 16px",
                                borderRadius: "8px",
                                border: "none",
                                cursor: "pointer",
                                background: "linear-gradient(135deg, #5865F2 0%, #4752c4 100%)",
                                color: "white",
                                fontWeight: "600",
                                fontSize: "13px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 2px 8px rgba(88, 101, 242, 0.35)",
                                transition: "opacity 0.15s ease"
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.82"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                        >
                            ⬇️ Import Backup
                        </button>
                        <button
                            onClick={handleReset}
                            style={{
                                padding: "9px 16px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                backgroundColor: "rgba(237, 66, 69, 0.12)",
                                color: "var(--status-danger)",
                                fontWeight: "600",
                                fontSize: "13px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                border: "1px solid rgba(237, 66, 69, 0.4)",
                                transition: "all 0.15s ease"
                            }}
                            onMouseEnter={e => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.backgroundColor = "rgba(237, 66, 69, 0.88)";
                                el.style.color = "white";
                            }}
                            onMouseLeave={e => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.backgroundColor = "rgba(237, 66, 69, 0.12)";
                                el.style.color = "var(--status-danger)";
                            }}
                        >
                            🔄 Reset All
                        </button>
                    </div>

                    {error && (
                        <div style={{ padding: "8px 12px", backgroundColor: "var(--status-danger-background)", borderRadius: "4px", marginBottom: "16px", color: "var(--status-danger)" }}>
                            ❌ {error}
                        </div>
                    )}

                    {images.length > 0 ? (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                            gap: "16px",
                            maxHeight: "400px",
                            overflowY: "auto",
                            padding: "8px",
                            backgroundColor: "var(--background-tertiary)",
                            borderRadius: "8px"
                        }}>
                            {images.map((src: string, index: number) => {
                                const isCurrent = index === pendingIndex;
                                const isNext = index === nextIndex;
                                const isBeingDragged = index === draggedIndex;
                                const isDragTarget = index === dragOverIndex;

                                return (
                                    <div
                                        key={index}
                                        draggable
                                        onClick={() => handleSelectCurrent(index)}
                                        onDragStart={(e) => handleImageDragStart(e, index)}
                                        onDragOver={(e) => handleImageDragOver(e, index)}
                                        onDragLeave={handleImageDragLeave}
                                        onDrop={(e) => handleImageDrop(e, index)}
                                        onDragEnd={handleImageDragEnd}
                                        style={{
                                            position: "relative",
                                            borderRadius: "8px",
                                            overflow: "hidden",
                                            border: isDragTarget ? "3px solid #faa61a" : isCurrent ? "3px solid #3ba55c" : isNext ? "3px solid #5865F2" : "3px solid transparent",
                                            backgroundColor: "var(--background-secondary)",
                                            boxShadow: isDragTarget ? "0 4px 20px rgba(250, 166, 26, 0.4)" : isCurrent ? "0 4px 20px rgba(59, 165, 92, 0.4)" : isNext ? "0 4px 16px rgba(88, 101, 242, 0.3)" : "0 2px 8px rgba(0,0,0,0.2)",
                                            cursor: "grab",
                                            opacity: isBeingDragged ? 0.5 : 1,
                                            transition: "all 0.15s ease"
                                        }}
                                        onMouseEnter={e => {
                                            if (!isCurrent && !isBeingDragged) {
                                                (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                                                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                                            if (!isCurrent && !isNext && !isDragTarget) {
                                                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                                            }
                                        }}
                                    >
                                        <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", backgroundColor: "#000" }}>
                                            <img
                                                src={src}
                                                alt={`Slide ${index + 1}`}
                                                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                                            />
                                        </div>

                                        <div style={{
                                            position: "absolute",
                                            top: "8px",
                                            left: "8px",
                                            backgroundColor: isCurrent ? "#3ba55c" : isNext ? "#5865F2" : "rgba(0,0,0,0.75)",
                                            color: "white",
                                            padding: "4px 8px",
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            backdropFilter: "blur(4px)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px"
                                        }}>
                                            {isCurrent && "▶"}
                                            {isNext && "→"}
                                            #{index + 1}
                                        </div>

                                        <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", gap: "6px" }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPreviewImage(src); }}
                                                style={{ backgroundColor: "rgba(0,0,0,0.75)", color: "white", border: "none", borderRadius: "6px", width: "28px", height: "28px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", transition: "background-color 0.15s" }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(88, 101, 242, 0.9)"}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.75)"}
                                                title="View"
                                            >🔍</button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const a = document.createElement("a");
                                                    a.href = src;
                                                    a.download = `stream-preview-${index + 1}.jpg`;
                                                    a.click();
                                                }}
                                                style={{ backgroundColor: "rgba(0,0,0,0.75)", color: "white", border: "none", borderRadius: "6px", width: "28px", height: "28px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", transition: "background-color 0.15s" }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(88, 101, 242, 0.9)"}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.75)"}
                                                title="Download"
                                            >⬇</button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                                                style={{ backgroundColor: "rgba(0,0,0,0.75)", color: "white", border: "none", borderRadius: "6px", width: "28px", height: "28px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", transition: "background-color 0.15s" }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(237, 66, 69, 0.9)"}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.75)"}
                                                title="Delete"
                                            >✕</button>
                                        </div>

                                        {isCurrent && (
                                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "4px", backgroundColor: "#3ba55c", borderRadius: "0 0 5px 5px" }} />
                                        )}

                                        {imageSizes[index] && (
                                            <div style={{ position: "absolute", bottom: "6px", right: "8px", backgroundColor: "rgba(0,0,0,0.8)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "500", backdropFilter: "blur(4px)", whiteSpace: "nowrap" }}>
                                                📦 {formatFileSize(imageSizes[index])}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: "40px", textAlign: "center", backgroundColor: "var(--background-secondary)", borderRadius: "12px", border: "2px dashed var(--background-modifier-accent)" }}>
                            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📷</div>
                            <Text variant="text-lg/semibold" style={{ color: "var(--text-normal)", marginBottom: "8px" }}>No images</Text>
                            <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>Drag images here or click "Add Image"</Text>
                        </div>
                    )}

                    <div style={{ marginTop: "16px", padding: "10px 14px", backgroundColor: "var(--background-secondary)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px" }}>💾</span>
                        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                            Images stored locally • Limit: {MAX_IMAGES_PER_PROFILE} images per profile • Use Export/Import to back up your profiles
                        </Text>
                    </div>
                </div>
            </ModalContent>
            <ModalFooter>
                <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                    <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                        📁 {profiles.get(currentProfileId)?.name || "Default"}: {images.length} / {MAX_IMAGES_PER_PROFILE} images
                    </Text>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <Button onClick={handleCancel} style={{ padding: "10px 20px" }}>Cancel</Button>
                        <Button color={Button.Colors.GREEN} onClick={handleSave} style={{ padding: "10px 24px" }}>✓ Save</Button>
                    </div>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
}

function openImagePicker() {
    openModal((props: any) => <ImagePickerModal rootProps={props} />);
}

function StreamPreviewIcon({ imageCount, isEnabled, isSlideshowEnabled, isRandom, currentImageUri, streamActive }: {
    imageCount: number;
    isEnabled: boolean;
    isSlideshowEnabled: boolean;
    isRandom: boolean;
    currentImageUri: string | null;
    streamActive: boolean;
}) {
    return (
        <div style={{ position: "relative" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path fill="currentColor" d="M21 3H3C1.9 3 1 3.9 1 5V17C1 18.1 1.9 19 3 19H8V21H16V19H21C22.1 19 23 18.1 23 17V5C23 3.9 22.1 3 21 3ZM21 17H3V5H21V17Z" />
                <path fill={isEnabled ? "var(--status-positive)" : "currentColor"} d="M12 7C10.34 7 9 8.34 9 10C9 11.66 10.34 13 12 13C13.66 13 15 11.66 15 10C15 8.34 13.66 7 12 7Z" />
                <path fill={isEnabled ? "var(--status-positive)" : "currentColor"} d="M18 14L15 11L12 14L9 11L6 14V15H18V14Z" />
            </svg>
            {imageCount > 1 && isSlideshowEnabled && isEnabled && (
                <div style={{ position: "absolute", top: "-4px", right: "-6px", backgroundColor: "var(--status-positive)", color: "white", fontSize: "9px", fontWeight: "bold", borderRadius: "6px", minWidth: "12px", height: "12px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                    {imageCount}
                </div>
            )}
            {imageCount > 1 && isSlideshowEnabled && isRandom && isEnabled && (
                <div style={{ position: "absolute", bottom: "-4px", right: "-6px", fontSize: "10px", lineHeight: "1" }}>🎲</div>
            )}
        </div>
    );
}

function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds} sec`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) return `${mins} min`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StreamPreviewPanelButton(props: { nameplate?: any; }) {
    if (!settings.store.showPanelButton) return null;
    const [imageCount, setImageCount] = useState(0);
    const [isEnabled, setIsEnabled] = useState(settings.store.replaceEnabled);
    const [isSlideshowEnabled, setIsSlideshowEnabled] = useState(settings.store.slideshowEnabled);
    const [isRandom, setIsRandom] = useState(settings.store.slideshowRandom);
    const [currentIndex, setCurrentIndex] = useState(currentSlideIndex);
    const [secondsAgo, setSecondsAgo] = useState(() => lastSlideChangeTime > 0 ? Math.floor((Date.now() - lastSlideChangeTime) / 1000) : 0);
    const [streamActive, setStreamActive] = useState(isStreamActive);
    const [currentImageUri, setCurrentImageUri] = useState<string | null>(null);

    useEffect(() => {
        const updateState = () => {
            setImageCount(getImageCount());
            setIsEnabled(settings.store.replaceEnabled);
            setIsSlideshowEnabled(settings.store.slideshowEnabled);
            setIsRandom(settings.store.slideshowRandom);
            setCurrentIndex(currentSlideIndex);
            setStreamActive(isStreamActive);
            setCurrentImageUri(actualStreamImageUri);
        };

        updateState();
        imageChangeListeners.add(updateState);

        const timerInterval = setInterval(() => {
            if (!isStreamActive) return;
            setStreamActive(true);
            if (lastSlideChangeTime > 0) {
                setSecondsAgo(Math.floor((Date.now() - lastSlideChangeTime) / 1000));
            }
        }, 1000);

        return () => {
            imageChangeListeners.delete(updateState);
            clearInterval(timerInterval);
        };
    }, []);

    const getTooltip = () => {
        if (imageCount === 0) return "Select Stream Preview";
        if (!isEnabled) return `Stream preview (disabled, ${imageCount} images)`;
        const timeInfo = lastSlideChangeTime > 0 && streamActive ? `\n⏱️ sent ${formatTime(secondsAgo)} ago` : streamActive ? "" : "\n⚫ Stream not active";
        if (imageCount === 1) return `Stream preview (1 image)${timeInfo}`;
        if (isSlideshowEnabled) {
            const slideInfo = `\n📍 Current: #${currentIndex + 1}`;
            if (isRandom) return `Stream preview (${imageCount} images, random)${slideInfo}${timeInfo}`;
            return `Stream preview (${imageCount} images, slideshow)${slideInfo}${timeInfo}`;
        }
        return `Stream preview (${imageCount} images)${timeInfo}`;
    };

    const renderTooltip = () => {
        const tooltipText = getTooltip();
        if (currentImageUri && isEnabled && imageCount > 0 && streamActive) {
            return (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                    <div style={{ width: "160px", height: "90px", borderRadius: "4px", overflow: "hidden", border: "2px solid var(--status-positive)", boxShadow: "0 0 8px rgba(59, 165, 92, 0.5)" }}>
                        <img src={currentImageUri} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                    <div style={{ whiteSpace: "pre-line", textAlign: "center", fontSize: "12px", lineHeight: "1.4" }}>{tooltipText}</div>
                </div>
            );
        }
        return tooltipText;
    };

    return (
        <PanelButton
            tooltipText={renderTooltip()}
            icon={() => <StreamPreviewIcon
                imageCount={imageCount}
                isEnabled={isEnabled}
                isSlideshowEnabled={isSlideshowEnabled}
                isRandom={isRandom}
                currentImageUri={currentImageUri}
                streamActive={streamActive}
            />}
            onClick={openImagePicker}
            plated={props?.nameplate != null}
        />
    );
}

interface StreamContextProps {
    stream: {
        ownerId: string;
        guildId: string | null;
        channelId: string;
    };
}

const streamContextMenuPatch: NavContextMenuPatchCallback = (children: any[], { stream }: StreamContextProps) => {
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser || stream.ownerId !== currentUser.id) return;
    const group = findGroupChildrenByChildId(["fullscreen", "popout"], children);
    if (group) {
        group.push(<Menu.MenuItem id="custom-stream-preview" label="Custom Stream Preview" icon={ImageIcon} action={openImagePicker} />);
    } else {
        children.push(<Menu.MenuSeparator />, <Menu.MenuItem id="custom-stream-preview" label="Custom Stream Preview" icon={ImageIcon} action={openImagePicker} />);
    }
};

function advanceSlide() {
    if (cachedDataUris.length <= 1) return;
    currentSlideIndex = settings.store.slideshowRandom
        ? getRandomNext()
        : (currentSlideIndex + 1) % cachedDataUris.length;
    getActiveProfile().currentIndex = currentSlideIndex;
    notifyImageChange();
}

async function forceUploadPreview() {
    if (cachedDataUris.length === 0 || !settings.store.replaceEnabled) return;
    const image = cachedDataUris[currentSlideIndex] ?? cachedDataUris[0];

    try {
        const token = TokenMod?.getToken?.();
        const superProps = SuperPropsMod?.getSuperPropertiesBase64?.();
        if (!token || !superProps) return;

        const locale = LocaleMod?.getLocale?.() ?? "en-US";
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let streamKeyEncoded: string;

        if (capturedStreamKey) {
            streamKeyEncoded = capturedStreamKey.split(":").join("%3A");
        } else {
            const channelId = SelectedChannelStoreMod?.getVoiceChannelId?.();
            if (!channelId) return;
            const channel = ChannelStoreMod?.getChannel?.(channelId);
            if (!channel) return;
            const channelTypeMap: Record<number, string> = { 1: "call", 2: "guild", 3: "call" };
            const channelType = channelTypeMap[channel.type];
            if (!channelType) return;
            const userId = UserStore.getCurrentUser()?.id;
            if (!userId) return;
            const guildId = channel.guild_id ?? channel.getGuildId?.() ?? "";
            streamKeyEncoded = channelType === "guild"
                ? `guild%3A${guildId}%3A${channelId}%3A${userId}`
                : `call%3A${channelId}%3A${userId}`;
        }

        const res = await fetch(`https://discord.com/api/v9/streams/${streamKeyEncoded}/preview`, {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json",
                "X-Debug-Options": "bugReporterEnabled",
                "X-Discord-Locale": locale,
                "X-Discord-Timezone": timezone,
                "X-Super-Properties": superProps,
            },
            body: JSON.stringify({ thumbnail: image }),
        });

        if (res.ok) {
            lastSlideChangeTime = Date.now();
            isStreamActive = true;
            actualStreamImageUri = image;
            notifyImageChange();
        }
    } catch (e) {
        console.error("[CustomStreamTopQ] forceUploadPreview error:", e);
    }
}

function isBypassEnabled(): boolean {
    return settings.store.bypassPreviewToggle;
}

function getCustomThumbnail(originalThumbnail: string): string {
    isStreamActive = true;
    if (!settings.store.replaceEnabled || cachedDataUris.length === 0) {
        actualStreamImageUri = null;
        notifyImageChange();
        return originalThumbnail;
    }
    const idx = Math.min(currentSlideIndex, cachedDataUris.length - 1);
    lastSlideChangeTime = Date.now();
    actualStreamImageUri = cachedDataUris[idx];
    notifyImageChange();
    setTimeout(() => forceUploadPreview(), 0);
    return cachedDataUris[idx];
}

const manageStreamsContextPatch: NavContextMenuPatchCallback = (children: any[]) => {
    const group = findGroupChildrenByChildId(["manage-streams-stop-streaming", "manage-streams-change-windows"], children);
    const item = <Menu.MenuItem id="custom-stream-preview-manage" label="Custom Stream Preview" icon={ImageIcon} action={openImagePicker} />;
    if (group) group.push(item);
    else children.push(<Menu.MenuSeparator />, item);
};

const streamOptionsContextPatch: NavContextMenuPatchCallback = (children: any[]) => {
    children.push(<Menu.MenuSeparator />, <Menu.MenuItem id="custom-stream-preview-options" label="Custom Stream Preview" icon={ImageIcon} action={openImagePicker} />);
};

export default definePlugin({
    name: "CustomStreamTopQ",
    description: "Custom stream preview images with profiles & slideshow. GitHub: https://github.com/MrTopQ/customStream-Vencord",
    authors: [{ name: "TopQ", id: 523800559791374356n }, { name: "zFrxncesck1", id: 456195985404592149n }],

    settings,

    patches: [
        {
            find: ".DISPLAY_NAME_STYLES_COACHMARK)",
            replacement: {
                match: /(children:\[)(.{0,150}?)(accountContainerRef)/,
                replace: "$1$self.StreamPreviewPanelButton(arguments[0]),$2$3"
            }
        },
        {
            find: "\"ApplicationStreamPreviewUploadManager\"",
            all: true,
            replacement: [
                {
                    match: /body:\{thumbnail:(\i)\}/,
                    replace: "body:{thumbnail:$self.getCustomThumbnail($1)}"
                },
                {
                    match: /\{thumbnail:(\i)\}/,
                    replace: "{thumbnail:$self.getCustomThumbnail($1)}"
                }
            ]
        },
        {
            find: "showStreamPreview",
            replacement: {
                match: /showStreamPreview:(\i\.\i===\i)/,
                replace: "showStreamPreview:$1||$self.isBypassEnabled()"
            }
        }
    ],

    toolboxActions: {
        "Select Stream Preview": openImagePicker
    },

    StreamPreviewPanelButton: ErrorBoundary.wrap(StreamPreviewPanelButton, { noop: true }),
    getCustomThumbnail,
    isBypassEnabled,

    contextMenus: {
        "stream-context": streamContextMenuPatch,
        "manage-streams": manageStreamsContextPatch,
        "stream-options": streamOptionsContextPatch
    },

    async start() {
        await loadProfilesFromDataStore();
        syncCacheWithActiveProfile();
        notifyImageChange();

        const myId = () => UserStore.getCurrentUser()?.id;

        const onStreamCreate = (e: any) => {
            const key: string = e?.streamKey ?? "";
            if (key.split(":").pop() !== myId()) return;
            capturedStreamKey = key;
            isStreamActive = true;
            notifyImageChange();
            forceUploadPreview();
        };

        const onStreamUpdate = (e: any) => {
            const key: string = e?.streamKey ?? "";
            if (key.split(":").pop() !== myId()) return;
            capturedStreamKey = key;
            isStreamActive = true;
            notifyImageChange();
            forceUploadPreview();
        };

        const onStreamDelete = (e: any) => {
            const key: string = e?.streamKey ?? "";
            if (key.split(":").pop() !== myId()) return;
            isStreamActive = false;
            capturedStreamKey = null;
            actualStreamImageUri = null;
            notifyImageChange();
        };

        FluxDispatcher.subscribe("STREAM_CREATE", onStreamCreate);
        FluxDispatcher.subscribe("STREAM_START_NOTIFY_SHOULD_SHOW", onStreamCreate);
        FluxDispatcher.subscribe("STREAM_UPDATE", onStreamUpdate);
        FluxDispatcher.subscribe("STREAM_DELETE", onStreamDelete);
        FluxDispatcher.subscribe("STREAM_STOP", onStreamDelete);
        (this as any)._fluxHandlers = { onStreamCreate, onStreamUpdate, onStreamDelete };

        const scheduleTimer = () => {
            const ms = Math.max(1000, (settings.store.instantSlideshowInterval || 10) * 1000);
            instantTimer = setTimeout(() => {
                if (cachedDataUris.length > 0) {
                    if (settings.store.instantSlideshow && settings.store.slideshowEnabled && cachedDataUris.length > 1) {
                        if (userSelectedIndex !== null) userSelectedIndex = null;
                        else advanceSlide();
                    }
                    if (settings.store.instantSlideshow || settings.store.bypassPreviewToggle) {
                        forceUploadPreview();
                    }
                }
                scheduleTimer();
            }, ms);
        };
        scheduleTimer();
    },

    stop() {
        if (instantTimer) { clearTimeout(instantTimer as any); instantTimer = null; }
        const h = (this as any)._fluxHandlers;
        if (h) {
            FluxDispatcher.unsubscribe("STREAM_CREATE", h.onStreamCreate);
            FluxDispatcher.unsubscribe("STREAM_START_NOTIFY_SHOULD_SHOW", h.onStreamCreate);
            FluxDispatcher.unsubscribe("STREAM_UPDATE", h.onStreamUpdate);
            FluxDispatcher.unsubscribe("STREAM_DELETE", h.onStreamDelete);
            FluxDispatcher.unsubscribe("STREAM_STOP", h.onStreamDelete);
        }
        cachedDataUris = [];
        currentSlideIndex = 0;
        isStreamActive = false;
        lastSlideChangeTime = 0;
        capturedStreamKey = null;
        randomQueue = [];
        userSelectedIndex = null;
        profiles.clear();
        activeProfileId = DEFAULT_PROFILE_ID;
    }
});