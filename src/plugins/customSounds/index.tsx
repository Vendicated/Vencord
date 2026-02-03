/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { Button, Forms, React, showToast, TextInput } from "@webpack/common";

import { AudioFileMetadata, getAllAudioMetadata, getAudioDataURI, getMaxFileSizeMB, getStorageInfo, migrateStorage, setMaxFileSizeMB } from "./audioStore";
import { SoundOverrideComponent } from "./SoundOverrideComponent";
import { makeEmptyOverride, seasonalSounds, SoundOverride, soundTypes } from "./types";

const SEASONAL_IDS = new Set(Object.keys(seasonalSounds));

const cl = classNameFactory("vc-custom-sounds-");

const allSoundTypes = soundTypes || [];

// LRU-style cache with dynamic size limit based on max file size setting
// Cache size = max file size * 5 (allows caching several files)
// Base64 encoding adds ~37% overhead, so we account for that
const BASE64_OVERHEAD = 1.37;
let maxCacheSizeBytes = 100 * 1024 * 1024; // Default 100MB, updated on start
const dataUriCache = new Map<string, string>();
let currentCacheSize = 0;

function updateCacheLimit(maxFileSizeMB: number): void {
    // Cache can hold ~5 files at max size (accounting for base64 overhead)
    // Minimum 50MB, maximum 500MB to prevent extreme memory usage
    const calculatedSize = Math.round(maxFileSizeMB * BASE64_OVERHEAD * 5);
    maxCacheSizeBytes = Math.min(Math.max(calculatedSize, 50), 500) * 1024 * 1024;
}

function addToCache(fileId: string, dataUri: string): void {
    const uriSize = dataUri.length;

    // If this single item is larger than the max cache, don't cache it
    if (uriSize > maxCacheSizeBytes) {
        console.warn(`[CustomSounds] File too large to cache (${Math.round(uriSize / (1024 * 1024))}MB > ${Math.round(maxCacheSizeBytes / (1024 * 1024))}MB limit)`);
        return;
    }

    // Evict oldest entries if needed (Map maintains insertion order)
    while (currentCacheSize + uriSize > maxCacheSizeBytes && dataUriCache.size > 0) {
        const oldestKey = dataUriCache.keys().next().value;
        if (oldestKey) {
            const oldestSize = dataUriCache.get(oldestKey)?.length || 0;
            dataUriCache.delete(oldestKey);
            currentCacheSize -= oldestSize;
        }
    }

    dataUriCache.set(fileId, dataUri);
    currentCacheSize += uriSize;
}

function getFromCache(fileId: string): string | undefined {
    const dataUri = dataUriCache.get(fileId);
    if (dataUri) {
        // Move to end (most recently used) by re-inserting
        dataUriCache.delete(fileId);
        dataUriCache.set(fileId, dataUri);
    }
    return dataUri;
}

function clearCache(): void {
    dataUriCache.clear();
    currentCacheSize = 0;
}

function getOverride(id: string): SoundOverride {
    const stored = settings.store[id];
    if (!stored) return makeEmptyOverride();

    if (typeof stored === "object") return stored;

    try {
        return JSON.parse(stored);
    } catch {
        return makeEmptyOverride();
    }
}

function setOverride(id: string, override: SoundOverride) {
    settings.store[id] = JSON.stringify(override);
}

export function getCustomSoundURL(id: string): string | null {
    const override = getOverride(id);

    if (!override?.enabled) {
        return null;
    }

    if (override.selectedSound === "custom" && override.selectedFileId) {
        const dataUri = getFromCache(override.selectedFileId);
        if (dataUri) {
            return dataUri;
        }
        // Cache miss - this shouldn't happen if preloading worked, but don't block
        return null;
    }

    if (override.selectedSound !== "default" && override.selectedSound !== "custom") {
        if (override.selectedSound in seasonalSounds) {
            return seasonalSounds[override.selectedSound];
        }

        const soundType = allSoundTypes.find(t => t.id === id);
        if (soundType?.seasonal) {
            const seasonalId = soundType.seasonal.find(seasonalId =>
                seasonalId.startsWith(`${override.selectedSound}_`)
            );
            if (seasonalId && seasonalId in seasonalSounds) {
                return seasonalSounds[seasonalId];
            }
        }
    }

    return null;
}

export async function ensureDataURICached(fileId: string): Promise<string | null> {
    const cached = getFromCache(fileId);
    if (cached) {
        return cached;
    }

    try {
        const dataUri = await getAudioDataURI(fileId);
        if (dataUri) {
            addToCache(fileId, dataUri);
            return dataUri;
        }
    } catch (error) {
        console.error(`[CustomSounds] Error loading audio for ${fileId}:`, error);
    }

    return null;
}

export async function refreshDataURI(id: string): Promise<void> {
    const override = getOverride(id);
    if (!override?.selectedFileId) {
        return;
    }

    await ensureDataURICached(override.selectedFileId);
}

function resetSeasonalOverridesToDefault(): void {
    let count = 0;
    for (const soundType of allSoundTypes) {
        const override = getOverride(soundType.id);
        if (override.enabled && SEASONAL_IDS.has(override.selectedSound)) {
            override.selectedSound = "default";
            setOverride(soundType.id, override);
            count++;
        }
    }
    if (count > 0) {
        console.log(`[CustomSounds] Reset ${count} seasonal sound(s) to default`);
    }
}

async function preloadDataURIs() {
    // Collect unique file IDs that need preloading
    const fileIdsToPreload = new Set<string>();

    for (const soundType of allSoundTypes) {
        const override = getOverride(soundType.id);
        if (override?.enabled && override.selectedSound === "custom" && override.selectedFileId) {
            fileIdsToPreload.add(override.selectedFileId);
        }
    }

    if (fileIdsToPreload.size === 0) {
        return;
    }

    // Preload each unique file (avoids duplicate loads if same file used for multiple sounds)
    let loaded = 0;
    for (const fileId of fileIdsToPreload) {
        try {
            await ensureDataURICached(fileId);
            loaded++;
        } catch (error) {
            console.error(`[CustomSounds] Failed to preload file ${fileId}:`, error);
        }
    }

    console.log(`[CustomSounds] Preloaded ${loaded}/${fileIdsToPreload.size} custom sounds`);
}

export async function debugCustomSounds() {
    console.log("[CustomSounds] === DEBUG INFO ===");

    // Settings info
    console.log(`[CustomSounds] Max file size: ${getMaxFileSizeMB()}MB`);
    console.log(`[CustomSounds] Max cache size: ${Math.round(maxCacheSizeBytes / (1024 * 1024))}MB`);

    // Storage info
    const storageInfo = await getStorageInfo();
    console.log(`[CustomSounds] Stored files: ${storageInfo.fileCount}, Total size: ${storageInfo.totalSizeKB}KB`);

    // Memory cache info
    console.log(`[CustomSounds] Memory cache: ${dataUriCache.size} items, ${Math.round(currentCacheSize / 1024)}KB`);

    // Count enabled overrides
    let enabledCount = 0;
    let customSoundCount = 0;

    for (const soundType of allSoundTypes) {
        const override = getOverride(soundType.id);
        if (override.enabled) {
            enabledCount++;
            if (override.selectedSound === "custom") {
                customSoundCount++;
            }
        }
    }

    console.log(`[CustomSounds] Enabled overrides: ${enabledCount} (${customSoundCount} custom)`);

    // List all files
    const metadata = await getAllAudioMetadata();
    console.log("[CustomSounds] Audio files:");
    for (const [id, file] of Object.entries(metadata)) {
        console.log(`  - ${file.name} (${Math.round(file.size / 1024)}KB) [${id}]`);
    }

    console.log("[CustomSounds] === END DEBUG ===");
}

const soundSettings = Object.fromEntries(
    allSoundTypes.map(type => [
        type.id,
        {
            type: OptionType.STRING,
            description: `Override for ${type.name}`,
            default: JSON.stringify(makeEmptyOverride()),
            hidden: true
        }
    ])
);

// File size options (in MB)
const fileSizeOptions = [
    { value: 5, label: "5 MB (Conservative)" },
    { value: 15, label: "15 MB (Default)" },
    { value: 30, label: "30 MB (Large)" },
    { value: 50, label: "50 MB (Very Large)" },
    { value: 100, label: "100 MB (Extreme - Use with caution!)" },
];

const settings = definePluginSettings({
    ...soundSettings,
    maxFileSize: {
        type: OptionType.SELECT,
        description: "Maximum file size for custom audio uploads. Larger sizes use more memory and may cause performance issues or crashes on lower-end devices. Increase at your own risk!",
        options: fileSizeOptions,
        default: 15,
        onChange: (value: number) => {
            setMaxFileSizeMB(value);
            updateCacheLimit(value);
        }
    },
    resetSeasonalOnStartup: {
        type: OptionType.BOOLEAN,
        description: "Reset seasonal sounds to default on startup. Any sound set to a Halloween/Winter variant will be changed back to Default when the plugin loads.",
        default: true
    },
    overrides: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const [resetTrigger, setResetTrigger] = React.useState(0);
            const [searchQuery, setSearchQuery] = React.useState("");
            const [files, setFiles] = React.useState<Record<string, AudioFileMetadata>>({});
            const [filesLoaded, setFilesLoaded] = React.useState(false);
            const fileInputRef = React.useRef<HTMLInputElement>(null);

            const loadFiles = React.useCallback(async () => {
                try {
                    const metadata = await getAllAudioMetadata();
                    setFiles(metadata);
                    setFilesLoaded(true);
                } catch (error) {
                    console.error("[CustomSounds] Error loading audio metadata:", error);
                    setFilesLoaded(true);
                }
            }, []);

            React.useEffect(() => {
                allSoundTypes.forEach(type => {
                    if (!settings.store[type.id]) {
                        setOverride(type.id, makeEmptyOverride());
                    }
                });
                loadFiles();
            }, []);

            const resetOverrides = () => {
                allSoundTypes.forEach(type => {
                    setOverride(type.id, makeEmptyOverride());
                });
                clearCache();
                setResetTrigger(prev => prev + 1);
                showToast("All overrides reset successfully!");
            };

            const triggerFileUpload = () => {
                fileInputRef.current?.click();
            };

            const handleSettingsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (e: ProgressEvent<FileReader>) => {
                        try {
                            resetOverrides();
                            const imported = JSON.parse(e.target?.result as string);

                            if (imported.overrides && Array.isArray(imported.overrides)) {
                                imported.overrides.forEach((setting: any) => {
                                    if (setting.id) {
                                        const override: SoundOverride = {
                                            enabled: setting.enabled ?? false,
                                            selectedSound: setting.selectedSound ?? "default",
                                            selectedFileId: setting.selectedFileId ?? undefined,
                                            volume: setting.volume ?? 100,
                                            useFile: false
                                        };
                                        setOverride(setting.id, override);
                                    }
                                });
                            }

                            setResetTrigger(prev => prev + 1);
                            showToast("Settings imported successfully!");
                        } catch (error) {
                            console.error("Error importing settings:", error);
                            showToast("Error importing settings. Check console for details.");
                        }
                    };

                    reader.readAsText(file);
                    event.target.value = "";
                }
            };

            const downloadSettings = async () => {
                const overrides = allSoundTypes.map(type => {
                    const override = getOverride(type.id);
                    return {
                        id: type.id,
                        enabled: override.enabled,
                        selectedSound: override.selectedSound,
                        selectedFileId: override.selectedFileId ?? undefined,
                        volume: override.volume
                    };
                }).filter(o => o.enabled || o.selectedSound !== "default");

                const exportPayload = {
                    overrides,
                    __note: "Audio files are not included in exports and will need to be re-uploaded after import"
                };

                const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "customSounds-settings.json";
                a.click();
                URL.revokeObjectURL(url);

                showToast(`Exported ${overrides.length} settings (audio files not included)`);
            };

            const filteredSoundTypes = allSoundTypes.filter(type =>
                type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                type.id.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
                <div>
                    <div className="vc-custom-sounds-buttons">
                        <Button color={Button.Colors.BRAND} onClick={triggerFileUpload}>Import</Button>
                        <Button color={Button.Colors.PRIMARY} onClick={downloadSettings}>Export</Button>
                        <Button color={Button.Colors.RED} onClick={resetOverrides}>Reset All</Button>
                        <Button color={Button.Colors.WHITE} onClick={debugCustomSounds}>Debug</Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            style={{ display: "none" }}
                            onChange={handleSettingsUpload}
                        />
                    </div>

                    <div className={cl("search")}>
                        <Forms.FormTitle>Search Sounds</Forms.FormTitle>
                        <TextInput
                            value={searchQuery}
                            onChange={e => setSearchQuery(e)}
                            placeholder="Search by name or ID"
                        />
                    </div>

                    {!filesLoaded ? (
                        <Forms.FormText>Loading audio files...</Forms.FormText>
                    ) : (
                        <div className={cl("sounds-list")}>
                            {filteredSoundTypes.map(type => {
                                const currentOverride = getOverride(type.id);

                                return (
                                    <SoundOverrideComponent
                                        key={`${type.id}-${resetTrigger}`}
                                        type={type}
                                        override={currentOverride}
                                        files={files}
                                        onFilesChange={loadFiles}
                                        onChange={async () => {
                                            setOverride(type.id, currentOverride);

                                            if (currentOverride.enabled && currentOverride.selectedSound === "custom" && currentOverride.selectedFileId) {
                                                try {
                                                    await ensureDataURICached(currentOverride.selectedFileId);
                                                } catch (error) {
                                                    console.error("[CustomSounds] Failed to load custom sound:", error);
                                                    showToast("Error loading custom sound file");
                                                }
                                            }
                                        }}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }
    }
});

export function isOverriden(id: string): boolean {
    return !!getOverride(id)?.enabled;
}

export function findOverride(id: string): SoundOverride | null {
    const override = getOverride(id);
    return override?.enabled ? override : null;
}

export default definePlugin({
    name: "CustomSounds",
    description: "Customize Discord's sounds.",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    patches: [
        {
            find: 'Error("could not play audio")',
            replacement: [
                {
                    match: /(?<=new Audio;\i\.src=)\i\([0-9]+\)\("\.\/"\.concat\(this\.name,"\.mp3"\)\)/,
                    replace: "(() => { const customUrl = $self.getCustomSoundURL(this.name); return customUrl || $& })()"
                },
                {
                    match: /Math.min\(\i\.\i\.getOutputVolume\(\)\/100\*this\._volume/,
                    replace: "$& * ($self.findOverride(this.name)?.volume ?? 100) / 100"
                }
            ]
        },
        {
            find: ".playWithListener().then",
            replacement: {
                match: /\i\.\i\.getSoundpack\(\)/,
                replace: '$self.isOverriden(arguments[0]) ? "classic" : $&'
            }
        }
    ],
    settings,
    findOverride,
    isOverriden,
    getCustomSoundURL,
    refreshDataURI,
    ensureDataURICached,
    debugCustomSounds,
    startAt: StartAt.Init,

    async start() {
        try {
            // Initialize max file size and cache limit from settings
            const maxSize = settings.store.maxFileSize ?? 15;
            setMaxFileSizeMB(maxSize);
            updateCacheLimit(maxSize);

            // Optionally reset seasonal sounds to default on startup
            if (settings.store.resetSeasonalOnStartup) {
                resetSeasonalOverridesToDefault();
            }

            // Migrate old storage format if needed (removes redundant buffers)
            await migrateStorage();

            // Preload enabled custom sounds into memory
            await preloadDataURIs();
        } catch (error) {
            console.error("[CustomSounds] Startup error:", error);
        }
    }
});

