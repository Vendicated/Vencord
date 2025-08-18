/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Margins } from "@utils/margins";
import { useForceUpdater } from "@utils/react";
import { makeRange } from "@utils/types";
import { findByCodeLazy, findLazy } from "@webpack";
import { Button, Card, Forms, React, Select, showToast, Slider, Switch } from "@webpack/common";
import { ComponentType, Ref, SyntheticEvent } from "react";

import { deleteAudio, getAllAudio, saveAudio, StoredAudioFile } from "./audioStore";
import { ensureDataURICached } from "./index";
import { SoundOverride, SoundPlayer, SoundType } from "./types";

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "webm", "wma", "mp4"];
const cl = classNameFactory("vc-custom-sounds-");
const playSound: (id: string) => SoundPlayer = findByCodeLazy(".playWithListener().then");
const FileInput: FileInput = findLazy(m => m.prototype?.activateUploadDialogue && m.prototype.setRef);

const capitalizeWords = (str: string) =>
    str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export function SoundOverrideComponent({ type, override, onChange }: {
    type: SoundType;
    override: SoundOverride;
    onChange: () => Promise<void>;
}) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const update = useForceUpdater();
    const sound = React.useRef<SoundPlayer | null>(null);
    const [files, setFiles] = React.useState<Record<string, StoredAudioFile>>({});

    React.useEffect(() => {
        getAllAudio().then(setFiles);
    }, []);

    const saveAndNotify = async () => {
        await onChange();
        update();
    };

    const previewSound = async () => {
        sound.current?.stop();

        if (!override.enabled) {
            sound.current = playSound(type.id);
            return;
        }

        const { selectedSound } = override;

        if (selectedSound === "custom" && override.selectedFileId) {
            try {
                const dataUri = await ensureDataURICached(override.selectedFileId);

                if (!dataUri || !dataUri.startsWith("data:audio/")) {
                    showToast("No custom sound file available for preview");
                    return;
                }

                const audio = new Audio(dataUri);
                audio.volume = override.volume / 100;

                audio.onerror = e => {
                    console.error("[CustomSounds] Error playing custom audio:", e);
                    showToast("Error playing custom sound. File may be corrupted.");
                };

                await audio.play();
                sound.current = {
                    play: () => audio.play(),
                    pause: () => audio.pause(),
                    stop: () => {
                        audio.pause();
                        audio.currentTime = 0;
                    },
                    loop: () => { audio.loop = true; }
                };
            } catch (error) {
                console.error("[CustomSounds] Error in previewSound:", error);
                showToast("Error playing sound.");
            }
        } else if (selectedSound === "default") {
            sound.current = playSound(type.id);
        } else {
            sound.current = playSound(selectedSound);
        }
    };

    const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        if (!fileExtension || !AUDIO_EXTENSIONS.includes(fileExtension)) {
            showToast("Invalid file type. Please upload an audio file.");
            event.target.value = "";
            return;
        }

        try {
            showToast("Uploading file...");
            const id = await saveAudio(file);

            const savedFiles = await getAllAudio();
            setFiles(savedFiles);

            override.selectedFileId = id;
            override.selectedSound = "custom";

            await ensureDataURICached(id);
            await saveAndNotify();

            showToast(`File uploaded successfully: ${file.name}`);
        } catch (error) {
            console.error("[CustomSounds] Error uploading file:", error);
            showToast(`Error uploading file: ${error}`);
        }

        event.target.value = "";
    };

    const deleteFile = async (id: string) => {
        try {
            await deleteAudio(id);
            const updated = await getAllAudio();
            setFiles(updated);

            if (override.selectedFileId === id) {
                override.selectedFileId = undefined;
                override.selectedSound = "default";
                await saveAndNotify();
            } else {
                update();
            }
            showToast("File deleted successfully");
        } catch (error) {
            console.error("[CustomSounds] Error deleting file:", error);
            showToast("Error deleting file.");
        }
    };

    const customFileOptions = Object.entries(files)
        .filter(([id, file]) => !!id && !!file?.name)
        .map(([id, file]) => ({
            value: id,
            label: file.name
        }));

    return (
        <Card className={cl("card")}>
            <Switch
                value={override.enabled || false}
                onChange={async val => {
                    console.log(`[CustomSounds] Setting ${type.id} enabled to:`, val);

                    override.enabled = val;

                    if (val && override.selectedSound === "custom" && override.selectedFileId) {
                        try {
                            await ensureDataURICached(override.selectedFileId);
                        } catch (error) {
                            console.error(`[CustomSounds] Failed to cache data URI for ${type.id}:`, error);
                            showToast("Error loading custom sound file");
                        }
                    }

                    await saveAndNotify();
                    console.log("[CustomSounds] After setting enabled, override.enabled =", override.enabled);
                }}
                className={Margins.bottom16}
                hideBorder
            >
                {type.name}
            </Switch>

            {override.enabled && (
                <>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                        <Button
                            color={Button.Colors.GREEN}
                            onClick={previewSound}
                        >
                            Preview
                        </Button>
                        <Button
                            color={Button.Colors.RED}
                            onClick={() => sound.current?.stop()}
                        >
                            Stop
                        </Button>
                    </div>

                    <Forms.FormTitle>Volume</Forms.FormTitle>
                    <Slider
                        markers={makeRange(0, 100, 10)}
                        initialValue={override.volume}
                        onValueChange={val => {
                            override.volume = val;
                            saveAndNotify();
                        }}
                        className={Margins.bottom16}
                        disabled={!override.enabled}
                    />

                    <Forms.FormTitle>Sound Source</Forms.FormTitle>
                    <Select
                        options={[
                            { value: "default", label: "Default" },
                            ...(type.seasonal?.map(id => ({ value: id, label: capitalizeWords(id) })) ?? []),
                            { value: "custom", label: "Custom" }
                        ]}
                        isSelected={v => v === override.selectedSound}
                        select={async v => {
                            override.selectedSound = v;

                            if (v === "custom" && override.selectedFileId) {
                                try {
                                    await ensureDataURICached(override.selectedFileId);
                                } catch (error) {
                                    console.error(`[CustomSounds] Failed to cache data URI for ${type.id}:`, error);
                                    showToast("Error loading custom sound file");
                                }
                            }

                            await saveAndNotify();
                        }}
                        serialize={opt => opt.value}
                        className={Margins.bottom16}
                    />

                    {override.selectedSound === "custom" && (
                        <>
                            <Forms.FormTitle>Custom File</Forms.FormTitle>
                            <Select
                                options={[
                                    { value: "", label: "Select a file..." },
                                    ...customFileOptions
                                ]}
                                isSelected={v => v === (override.selectedFileId || "")}
                                select={async id => {
                                    if (!id) {
                                        override.selectedFileId = undefined;
                                    } else {
                                        override.selectedFileId = id;
                                        await ensureDataURICached(id);
                                    }

                                    await saveAndNotify();
                                }}
                                serialize={opt => opt.value}
                                className={Margins.bottom8}
                            />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".mp3,.wav,.ogg,.m4a,.flac,.aac,.webm,.wma,.mp4"
                                style={{ display: "none" }}
                                onChange={uploadFile}
                            />
                            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    color={Button.Colors.BRAND}
                                >
                                    Upload New
                                </Button>

                                {override.selectedFileId && files[override.selectedFileId] && (
                                    <Button
                                        color={Button.Colors.RED}
                                        onClick={() => deleteFile(override.selectedFileId!)}
                                    >
                                        Delete Selected File
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}
        </Card>
    );
}
