/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { get as getFromDataStore } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { Button, Forms, React, showToast, TextInput } from "@webpack/common";

import { getAllAudio, getAudioDataURI } from "./audioStore";
import { SoundOverrideComponent } from "./SoundOverrideComponent";
import { makeEmptyOverride, seasonalSounds, SoundOverride, soundTypes } from "./types";

const cl = classNameFactory("vc-custom-sounds-");

const allSoundTypes = soundTypes || [];

const AUDIO_STORE_KEY = "ScattrdCustomSounds";

const dataUriCache = new Map<string, string>();

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
        const dataUri = dataUriCache.get(override.selectedFileId);
        if (dataUri) {
            console.log(`[CustomSounds] Returning cached data URI for ${id}`);
            return dataUri;
        } else {
            console.warn(`[CustomSounds] No cached data URI for ${id} with file ID ${override.selectedFileId}`);
            return null;
        }
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
    if (dataUriCache.has(fileId)) {
        return dataUriCache.get(fileId)!;
    }

    try {
        const dataUri = await getAudioDataURI(fileId);
        if (dataUri) {
            dataUriCache.set(fileId, dataUri);
            console.log(`[CustomSounds] Cached data URI for file ${fileId}`);
            return dataUri;
        }
    } catch (error) {
        console.error(`[CustomSounds] Error generating data URI for ${fileId}:`, error);
    }

    return null;
}

export async function refreshDataURI(id: string): Promise<void> {
    const override = getOverride(id);
    if (!override?.selectedFileId) {
        console.log(`[CustomSounds] refreshDataURI called for ${id} but no selectedFileId`);
        return;
    }

    console.log(`[CustomSounds] Refreshing data URI for ${id} with file ID ${override.selectedFileId}`);

    const dataUri = await ensureDataURICached(override.selectedFileId);
    if (dataUri) {
        console.log(`[CustomSounds] Successfully cached data URI for ${id} (length: ${dataUri.length})`);
    } else {
        console.error(`[CustomSounds] Failed to cache data URI for ${id}`);
    }
}

async function preloadDataURIs() {
    console.log("[CustomSounds] Preloading data URIs into memory cache...");

    for (const soundType of allSoundTypes) {
        const override = getOverride(soundType.id);
        if (override?.enabled && override.selectedSound === "custom" && override.selectedFileId) {
            try {
                await ensureDataURICached(override.selectedFileId);
                console.log(`[CustomSounds] Preloaded data URI for ${soundType.id}`);
            } catch (error) {
                console.error(`[CustomSounds] Failed to preload data URI for ${soundType.id}:`, error);
            }
        }
    }

    console.log(`[CustomSounds] Memory cache contains ${dataUriCache.size} data URIs`);
}

export async function debugCustomSounds() {
    console.log("[CustomSounds] === DEBUG INFO ===");

    const rawDataStore = await getFromDataStore(AUDIO_STORE_KEY);
    console.log("[CustomSounds] Raw DataStore content:", rawDataStore);

    const allFiles = await getAllAudio();
    console.log(`[CustomSounds] Stored files: ${Object.keys(allFiles).length}`);

    let totalBufferSize = 0;
    let totalDataUriSize = 0;

    for (const [id, file] of Object.entries(allFiles)) {
        const bufferSize = file.buffer?.byteLength || 0;
        const dataUriSize = file.dataUri?.length || 0;
        totalBufferSize += bufferSize;
        totalDataUriSize += dataUriSize;

        console.log(`[CustomSounds] File ${id}:`, {
            name: file.name,
            type: file.type,
            bufferSize: `${(bufferSize / 1024).toFixed(1)}KB`,
            hasValidBuffer: file.buffer instanceof ArrayBuffer,
            hasDataUri: !!file.dataUri,
            dataUriSize: `${(dataUriSize / 1024).toFixed(1)}KB`
        });
    }

    console.log(`[CustomSounds] Total storage - Buffers: ${(totalBufferSize / 1024).toFixed(1)}KB, DataURIs: ${(totalDataUriSize / 1024).toFixed(1)}KB`);

    console.log(`[CustomSounds] Memory cache contains ${dataUriCache.size} data URIs`);

    console.log("[CustomSounds] Settings store structure:", Object.keys(settings.store));

    console.log("[CustomSounds] Sound override status:");
    let enabledCount = 0;
    let totalSettingsSize = 0;

    for (const [soundId, storedValue] of Object.entries(settings.store)) {
        if (soundId === "overrides") continue;

        const override = getOverride(soundId);
        const settingsSize = JSON.stringify(override).length;
        totalSettingsSize += settingsSize;

        console.log(`[CustomSounds] ${soundId}:`, {
            enabled: override.enabled,
            selectedSound: override.selectedSound,
            selectedFileId: override.selectedFileId,
            volume: override.volume,
            settingsSize: `${settingsSize}B`
        });

        if (override.enabled) enabledCount++;
    }

    console.log(`[CustomSounds] Total enabled overrides: ${enabledCount}`);
    console.log(`[CustomSounds] Estimated settings size: ${(totalSettingsSize / 1024).toFixed(1)}KB`);
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

const settings = definePluginSettings({
    ...soundSettings,
    overrides: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const [resetTrigger, setResetTrigger] = React.useState(0);
            const [searchQuery, setSearchQuery] = React.useState("");
            const fileInputRef = React.useRef<HTMLInputElement>(null);

            React.useEffect(() => {
                allSoundTypes.forEach(type => {
                    if (!settings.store[type.id]) {
                        setOverride(type.id, makeEmptyOverride());
                    }
                });
            }, []);

            const resetOverrides = () => {
                allSoundTypes.forEach(type => {
                    setOverride(type.id, makeEmptyOverride());
                });
                dataUriCache.clear();
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

                    <div className={cl("sounds-list")}>
                        {filteredSoundTypes.map(type => {
                            const currentOverride = getOverride(type.id);

                            return (
                                <SoundOverrideComponent
                                    key={`${type.id}-${resetTrigger}`}
                                    type={type}
                                    override={currentOverride}
                                    onChange={async () => {

                                        setOverride(type.id, currentOverride);

                                        if (currentOverride.enabled && currentOverride.selectedSound === "custom" && currentOverride.selectedFileId) {
                                            try {
                                                await ensureDataURICached(currentOverride.selectedFileId);
                                            } catch (error) {
                                                console.error(`[CustomSounds] Failed to cache data URI for ${type.id}:`, error);
                                                showToast("Error loading custom sound file");
                                            }
                                        }

                                        console.log(`[CustomSounds] Settings saved for ${type.id}:`, currentOverride);
                                    }}
                                />
                            );
                        })}
                    </div>
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
    authors: [Devs.ScattrdBlade, Devs.TheKodeToad],
    patches: [
        {
            find: 'Error("could not play audio")',
            replacement: [
                {
                    match: /(?<=new Audio;\i\.src=).{0,75}.concat\(this\.name,"\.mp3"\)\)/,
                    replace: "$self.getSoundUrl(this.name,$&)"
                },
                {
                    match: /Math.min\(\i\.\i\.getOutputVolume\(\).{0,20}volume/,
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
    getSoundUrl(name, extra) {
        const customUrl = this.getCustomSoundURL(name);
        return customUrl || extra;
    },
    settings,
    findOverride,
    isOverriden,
    getCustomSoundURL,
    refreshDataURI,
    ensureDataURICached,
    debugCustomSounds,
    startAt: StartAt.Init,

    async start() {
        console.log("[CustomSounds] Plugin starting...");

        try {
            await preloadDataURIs();
            console.log("[CustomSounds] Startup complete");
        } catch (error) {
            console.error("[CustomSounds] Startup failed:", error);
        }
    }
});
