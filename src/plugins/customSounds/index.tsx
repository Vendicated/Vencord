/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { saveFile } from "@utils/web";
import { MessageJSON } from "@vencord/discord-types";
import { Alerts, React, showToast, TextInput, UserStore } from "@webpack/common";

import * as AudioStore from "./audioStore";
import { LRU } from "./cache";
import { SoundOverrideComponent } from "./SoundOverrideComponent";
import { makeEmptyOverride, SEASONAL_SOUNDS, SettingsExport, SOUND_TYPES, SoundOverride } from "./types";

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "webm", "wma", "mp4"];
const audioExtensionsString = AUDIO_EXTENSIONS.map(v => `.${v}`).join(",");
const audioExtensionsFormattedString = AUDIO_EXTENSIONS.map(v => `.${v}`).join(", ");

const cl = classNameFactory("vc-custom-sounds-");

const allSoundTypes = SOUND_TYPES || [];

const dataUriCache = new LRU();
const logger = new Logger("CustomSounds");

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

function setOverride(id: string, override: SoundOverride): void {
    settings.store[id] = JSON.stringify(override);
}

export function getCustomSoundURL(id: string): string | null {
    const override = getOverride(id);

    if (!override?.enabled) return null;

    if (override.selectedSound === "custom" && override.selectedFileId) {
        // null => cache miss - shouldn't happen if preloading worked, but don't block
        return dataUriCache.get(override.selectedFileId) ?? null;
    }

    if (override.selectedSound !== "default" && override.selectedSound !== "custom") {
        if (override.selectedSound in SEASONAL_SOUNDS) return SEASONAL_SOUNDS[override.selectedSound];

        const soundType = allSoundTypes.find(t => t.id === id);
        if (!soundType?.seasonal) return null;

        // is it even possible for `override.selectedSound` to be "halloween" or "winter"?
        logger.debug(`${id} reached the seasonal check? soundType: ${soundType}`);
        const seasonalId = soundType.seasonal.find(id => id.startsWith(`${override.selectedSound}_`));
        if (seasonalId && seasonalId in SEASONAL_SOUNDS) {
            logger.debug(`${id} passed the seasonal check?? soundType: ${soundType}, seasonalId: ${seasonalId}`);
            return SEASONAL_SOUNDS[seasonalId];
        }
    }

    return null;
}

export async function ensureDataURICached(fileId: string): Promise<string | null> {
    const cached = dataUriCache.get(fileId);
    if (cached) return cached;

    try {
        const dataUri = await AudioStore.getAudioDataURI(fileId);
        if (dataUri) {
            dataUriCache.set(fileId, dataUri);
            return dataUri;
        }
    } catch (error) {
        logger.error(`Error loading audio for ${fileId}:`, error);
    }

    return null;
}

export async function refreshDataURI(id: string): Promise<void> {
    const override = getOverride(id);
    if (!override?.selectedFileId) return;

    await ensureDataURICached(override.selectedFileId);
}

function resetSeasonalOverridesToDefault(): void {
    let count = 0;
    for (const soundType of allSoundTypes) {
        const override = getOverride(soundType.id);
        if (override.enabled && override.selectedSound in SEASONAL_SOUNDS) {
            override.selectedSound = "default";
            setOverride(soundType.id, override);
            count++;
        }
    }
    if (count > 0) logger.info(`Reset ${count} seasonal sound(s) to default`);
}

async function preloadDataURIs(): Promise<void> {
    const fileIdsToPreload = new Set<string>();

    for (const soundType of allSoundTypes) {
        const override = getOverride(soundType.id);
        if (override?.enabled && override.selectedSound === "custom" && override.selectedFileId) {
            fileIdsToPreload.add(override.selectedFileId);
        }
    }

    if (fileIdsToPreload.size === 0) return;

    let loaded = 0;
    for (const fileId of fileIdsToPreload) {
        try {
            await ensureDataURICached(fileId);
            loaded++;
        } catch (error) {
            logger.error(`Failed to preload file ${fileId}:`, error);
        }
    }

    logger.info(`Preloaded ${loaded}/${fileIdsToPreload.size} custom sounds`);
}

export async function debugCustomSounds(): Promise<void> {
    logger.info("=== DEBUG INFO ===");
    logger.info(`Max file size: ${AudioStore.getMaxFileSizeMB()}MB`);
    logger.info(`Max cache size: ${Math.round(dataUriCache.maxSize() / (1024 * 1024))}MB`);

    const storageInfo = await AudioStore.getStorageInfo();
    logger.info(`Stored files: ${storageInfo.fileCount}, Total size: ${storageInfo.totalSizeKB}KB`);
    logger.info(`Memory cache: ${dataUriCache.size()} items, ${Math.round(dataUriCache.size() / 1024)}KB`);

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

    logger.info(`Enabled overrides: ${enabledCount} (${customSoundCount} custom)`);

    const metadata = await AudioStore.getAllAudioMetadata();
    const filesData: string = Object.entries(metadata)
        .map(([id, file]) => `  - ${file.name} (${Math.round(file.size / 1024)}KB) [${id}]`)
        .join("\n");

    logger.info("Audio files:\n" + filesData);
    logger.info("=== END DEBUG ===");
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

const fileSizeOptions = [
    { value: 5, label: "5 MB (Conservative)" },
    { value: 15, label: "15 MB (Default)" },
    { value: 30, label: "30 MB (Large)" },
    { value: 50, label: "50 MB (Very Large)" },
    { value: 100, label: "100 MB (Extreme - Use with caution!)" },
];

const settings = definePluginSettings({
    ...soundSettings,
    skipForAll: {
        type: OptionType.BOOLEAN,
        description: "Used for the existing file upload alert",
        default: false,
        hidden: true
    },
    maxFileSize: {
        type: OptionType.SELECT,
        description: "Larger uploads use more memory, take more time to process and may cause performance issues or crashes on lower-end devices. Increase at your own risk!",
        options: fileSizeOptions,
        default: 15,
        onChange: (value: number) => {
            AudioStore.setMaxFileSizeMB(value);
            dataUriCache.setSizeLimit(value);
        }
    },
    resetSeasonalSoundsOnStartup: {
        type: OptionType.BOOLEAN,
        description: "Any sound set to a Halloween/Winter variant will be changed back to Default when the plugin loads.",
        default: true
    },
    overrides: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const [searchQuery, setSearchQuery] = React.useState("");
            const [files, setFiles] = React.useState<Record<string, AudioStore.AudioFileMetadata>>({});
            const [filesLoaded, setFilesLoaded] = React.useState(false);
            const update = useForceUpdater();
            const audioFilesInputRef = React.useRef<HTMLInputElement>(null);
            const settingsFileInputRef = React.useRef<HTMLInputElement>(null);

            const loadFiles = React.useCallback(async () => {
                try {
                    const metadata = await AudioStore.getAllAudioMetadata();
                    setFiles(metadata);
                    setFilesLoaded(true);
                } catch (error) {
                    logger.error("Error loading audio metadata:", error);
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
                allSoundTypes.forEach(type => setOverride(type.id, makeEmptyOverride()));
            };

            const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
                const selectedFiles = event.target.files;
                if (!selectedFiles) return;

                showToast(selectedFiles.length > 1 ? `Uploading ${selectedFiles.length} files...` : "Uploading file...");

                const filteredFiles: File[] = [];
                for (const file of selectedFiles) {
                    if (!file) continue;

                    const fileExtension = file.name.split(".").pop()?.toLowerCase();
                    if (!fileExtension || !AUDIO_EXTENSIONS.includes(fileExtension)) {
                        showToast(`Invalid file type of "${file.name}". Please upload only audio files (${audioExtensionsFormattedString}).`);
                        continue;
                    }
                    filteredFiles.push(file);
                }

                const audioDataToSave: [AudioStore.StoredAudioFile, AudioStore.AudioFileMetadata][] = [];
                for (const file of filteredFiles) {
                    try {
                        const [data, metadata] = await AudioStore.processAudioFile(file);

                        if (files[metadata.id]) {
                            if (settings.store.skipForAll) continue;

                            const doSkip = await Alerts.confirm({
                                title: "The file already exists",
                                body: `You already have a file named "${metadata.name}" uploaded.`,
                                confirmText: "Skip",
                                secondaryConfirmText: "Skip for all",
                                cancelText: "Replace",
                                onConfirmSecondary() {
                                    settings.store.skipForAll = true;
                                },
                            });

                            if (doSkip) continue;
                        }

                        audioDataToSave.push([data, metadata]);
                    } catch (error: any) {
                        logger.error("Upload error:", error);
                        const message = error.message ?? "Unknown error";
                        showToast(message.includes("too large") ? message : `Upload of "${error.name}" failed: ${message}`);
                        continue;
                    }
                }
                settings.store.skipForAll = false;

                await AudioStore.saveAudioData(audioDataToSave);

                for (const [_, metadata] of audioDataToSave) await ensureDataURICached(metadata.id);

                update();
                await loadFiles();
                showToast(`Added ${audioDataToSave.length} file${audioDataToSave.length !== 1 ? "s" : ""}.`);
                event.target.value = "";
            };

            const handleSettingsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0];

                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (e: ProgressEvent<FileReader>) => {
                    try {
                        resetOverrides();
                        const imported: SettingsExport = JSON.parse(e.target?.result as string);

                        const empty = makeEmptyOverride();
                        const filesMissing: ({ id: string; } & SoundOverride)[] = [];
                        if (imported.overrides && Array.isArray(imported.overrides)) {
                            for (const setting of imported.overrides) {
                                if (!setting.id) continue;

                                const override: SoundOverride = {
                                    enabled: setting.enabled ?? empty.enabled,
                                    selectedSound: setting.selectedSound ?? empty.selectedSound,
                                    selectedFileId: setting.selectedFileId ?? empty.selectedFileId,
                                    volume: setting.volume ?? empty.volume,
                                };
                                setOverride(setting.id, override);

                                if (!setting.selectedFileId) continue;
                                if (!files[setting.selectedFileId]) filesMissing.push(setting);

                                await ensureDataURICached(setting.selectedFileId);
                            }
                        }

                        if (filesMissing.length !== 0) {
                            Alerts.show({
                                title: "Audio files not found",
                                body: `Seems like some custom audio files are missing: ${filesMissing.map(setting => setting.selectedFileId).join(", ")}. Do you want to add missing files?`,
                                async onConfirm() {
                                    audioFilesInputRef.current?.click();
                                },
                                async onCancel() {
                                    filesMissing.forEach(setting => {
                                        const override: SoundOverride = {
                                            enabled: setting.enabled,
                                            selectedSound: setting.selectedSound,
                                            selectedFileId: empty.selectedFileId,
                                            volume: setting.volume,
                                        };
                                        setOverride(setting.id, override);
                                    });
                                },
                                confirmText: "Yes",
                                cancelText: "No"
                            });
                        }

                        showToast("Settings imported successfully!");
                    } catch (error) {
                        logger.error("Error importing settings:", error);
                        showToast("Error importing settings. Check console for details.");
                    }
                };

                reader.readAsText(file);
                event.target.value = "";
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

                const exportPayload: SettingsExport = {
                    __note: "Audio files are not included in exports and will need to be re-added before import",
                    overrides
                };

                showToast(`Exporting ${overrides.length} settings... (Audio files are not included!)`);

                const file = new File(
                    [JSON.stringify(exportPayload, null, 2)],
                    "customSounds-settings.json",
                    { type: "application/json" }
                );
                saveFile(file);
            };

            const filteredSoundTypes = allSoundTypes.filter(type =>
                type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                type.id.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
                <div className={cl("main")}>
                    <div className={cl("section")}>
                        <Heading>Custom Audio Files</Heading>
                        <div className={cl("buttons")}>
                            <Button variant="positive" onClick={() => audioFilesInputRef.current?.click()}>Add</Button>
                            <Button
                                disabled={Object.keys(files).length === 0}
                                variant="dangerPrimary"
                                onClick={() => {
                                    Alerts.show({
                                        title: "Are you sure?",
                                        body: `This will remove ${Object.keys(files).length} file${Object.keys(files).length !== 1 ? "s" : ""} imported into the plugin.`,
                                        async onConfirm() {
                                            await AudioStore.clearStore();
                                            dataUriCache.clear();
                                            update();
                                            await loadFiles();
                                            allSoundTypes.forEach(type => {
                                                const override = getOverride(type.id);
                                                override.selectedFileId = undefined;
                                                setOverride(type.id, override);
                                            });
                                            showToast("Files removed successfully.");
                                        },
                                        confirmText: "Do it!",
                                        confirmColor: "vc-notification-log-danger-btn",
                                        cancelText: "Nevermind"
                                    });
                                }}
                            >
                                Remove All</Button>
                            <Button variant="overlayPrimary" onClick={() => {
                                debugCustomSounds();
                                showToast("Debug info printed in the console.");
                            }}
                            >
                                Debug</Button>
                            <input
                                ref={audioFilesInputRef}
                                type="file"
                                accept={audioExtensionsString}
                                multiple
                                style={{ display: "none" }}
                                onChange={uploadFiles}
                            />
                        </div>
                    </div>
                    <div className={cl("section")}>
                        <Heading>Overrides</Heading>
                        <div className={cl("buttons")}>
                            <Button variant="primary" onClick={() => settingsFileInputRef.current?.click()}>Import</Button>
                            <Button variant="secondary" onClick={downloadSettings}>Export</Button>
                            <Button variant="dangerPrimary" onClick={() => { resetOverrides(); showToast("All overrides reset successfully!"); }}>Reset All</Button>
                            <input
                                ref={settingsFileInputRef}
                                type="file"
                                accept=".json"
                                style={{ display: "none" }}
                                onChange={handleSettingsUpload}
                            />
                        </div>
                        <Paragraph>NOTE: before importing settings, make sure to add required audio files by clicking "Add" button.</Paragraph>
                    </div>
                    <div className={cl("search")}>
                        <Heading>Search Sounds</Heading>
                        <TextInput
                            value={searchQuery}
                            onChange={(e: string) => setSearchQuery(e)}
                            placeholder="Search by name or ID"
                        />
                    </div>

                    {!filesLoaded ? (
                        <Paragraph>Loading audio files...</Paragraph>
                    ) : (
                        <div className={cl("sounds-list")}>
                            {filteredSoundTypes.map(type => {
                                const currentOverride = getOverride(type.id);

                                if (currentOverride.selectedFileId &&
                                    !files[currentOverride.selectedFileId]) {
                                    currentOverride.selectedFileId = undefined;
                                    // setOverride(type.id, currentOverride);  // breaks "file missing" prompt
                                }

                                if (type.id === "disconnect") logger.debug("rerendering overrides list");

                                return (
                                    <SoundOverrideComponent
                                        key={type.id}
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
                                                    logger.error("Failed to load custom sound:", error);
                                                    showToast("Error loading custom sound file. Check console for details.");
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
    authors: [Devs.SyberiaK, Devs.ScattrdBlade, Devs.TheKodeToad],
    settings,
    patches: [
        {
            find: 'Error("could not play audio")',
            replacement: [
                {
                    match: /(?<=new Audio;\i\.src=)\i\([0-9]+\)\(`\.\/\$\{this\.name\}\.mp3`\)/,
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
        },
        {
            find: ".connectHasStarted",
            replacement: {
                match: /return;return"user_join"/,
                replace: 'return;return $self.isOverriden("connect") ? "connect" : "user_join"'
            }
        },
        {
            find: ".getDesktopType()===",
            replacement: [
                {
                    match: /sound:(\i\?\i:void 0,volume:\i,onClick)/,
                    replace: 'sound: $self.mentionsEveryone(arguments[0]?.message) && $self.isOverriden("mention2") ? "mention2" : $self.mentionsMe(arguments[0]?.message) && $self.isOverriden("user_mentioned") ? "user_mentioned" : $1'
                }
            ]
        }
    ],
    findOverride,
    isOverriden,
    getCustomSoundURL,
    refreshDataURI,
    ensureDataURICached,
    debugCustomSounds,
    mentionsEveryone(message: MessageJSON) {
        return message.mention_everyone;
    },
    mentionsMe(message: MessageJSON) {
        return message.mentions.some(m => m.id === UserStore.getCurrentUser().id);
    },
    startAt: StartAt.Init,

    async start() {
        try {
            const maxSize = settings.store.maxFileSize ?? 15;
            AudioStore.setMaxFileSizeMB(maxSize);
            dataUriCache.setSizeLimit(maxSize);

            if (settings.store.resetSeasonalSoundsOnStartup) {
                resetSeasonalOverridesToDefault();
            }

            const migratedFiles = await AudioStore.migrateStorage();
            if (migratedFiles) {
                allSoundTypes.forEach(type => {
                    const override = getOverride(type.id);
                    if (override.selectedFileId) {
                        const newId = migratedFiles[override.selectedFileId];
                        override.selectedFileId = newId ?? override.selectedFileId;
                        setOverride(type.id, override);
                    }
                });
            }

            await preloadDataURIs();
        } catch (error) {
            logger.error("Startup error:", error);
        }
    }
});
