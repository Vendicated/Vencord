/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Card } from "@components/Card";
import { FormSwitch } from "@components/FormSwitch";
import { Margins } from "@utils/margins";
import { useForceUpdater } from "@utils/react";
import { makeRange } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { Button, Forms, React, Select, showToast, Slider } from "@webpack/common";

import { AudioFileMetadata, deleteAudio, saveAudio } from "./audioStore";
import { ensureDataURICached } from "./index";
import { SoundOverride, SoundPlayer, SoundType } from "./types";

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "webm", "wma", "mp4"];
const cl = classNameFactory("vc-custom-sounds-");
const playSound: (id: string) => SoundPlayer = findByCodeLazy(".playWithListener().then");

const capitalizeWords = (str: string) =>
    str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export function SoundOverrideComponent({ type, override, onChange, files, onFilesChange }: {
    type: SoundType;
    override: SoundOverride;
    onChange: () => Promise<void>;
    files: Record<string, AudioFileMetadata>;
    onFilesChange: () => void;
}) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const update = useForceUpdater();
    const sound = React.useRef<SoundPlayer | null>(null);

    // Cleanup audio on unmount to prevent memory leaks
    React.useEffect(() => {
        return () => {
            sound.current?.stop();
            sound.current = null;
        };
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

                // Check if browser supports this format (e.g. WMA is not supported in Chrome/Firefox)
                const mimeMatch = dataUri.match(/^data:(audio\/[^;,]+)/i);
                const mimeType = mimeMatch ? mimeMatch[1] : "audio/mpeg";
                const testEl = document.createElement("audio");
                if (testEl.canPlayType(mimeType) === "") {
                    showToast("Your browser doesn't support this format. Try re-uploading as MP3 or WAV.");
                    return;
                }

                const audio = new Audio(dataUri);
                audio.volume = override.volume / 100;

                audio.onerror = () => {
                    const msg = audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
                        ? "Format not supported by browser. Try MP3 or WAV."
                        : "Could not play file. It may be corrupted or in an unsupported format.";
                    showToast(msg);
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
            } catch (error: unknown) {
                const err = error as Error & { name?: string; };
                console.error("[CustomSounds] Error in previewSound:", error);
                if (err?.name === "NotSupportedError" || err?.message?.includes("supported source")) {
                    showToast("Format not supported by your browser. Try re-uploading as MP3 or WAV.");
                } else {
                    showToast("Could not play sound. File may be corrupted or in an unsupported format.");
                }
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

            override.selectedFileId = id;
            override.selectedSound = "custom";

            await ensureDataURICached(id);
            await saveAndNotify();
            onFilesChange();

            showToast(`Uploaded: ${file.name}`);
        } catch (error: any) {
            console.error("[CustomSounds] Upload error:", error);
            // Show user-friendly error message
            const message = error?.message || "Unknown error";
            showToast(message.includes("too large") ? message : `Upload failed: ${message}`);
        }

        event.target.value = "";
    };

    const deleteFile = async (id: string) => {
        try {
            await deleteAudio(id);

            if (override.selectedFileId === id) {
                override.selectedFileId = undefined;
                override.selectedSound = "default";
                await saveAndNotify();
            }
            onFilesChange();
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
            <FormSwitch
                title={type.name}
                value={override.enabled || false}
                onChange={async val => {
                    override.enabled = val;

                    if (val && override.selectedSound === "custom" && override.selectedFileId) {
                        try {
                            await ensureDataURICached(override.selectedFileId);
                        } catch (error) {
                            console.error("[CustomSounds] Failed to load custom sound:", error);
                            showToast("Error loading custom sound file");
                        }
                    }

                    await saveAndNotify();
                }}
                className={Margins.bottom16}
                hideBorder
            />

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
