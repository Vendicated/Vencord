/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { makeRange } from "@components/PluginSettings/components";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import { findByCodeLazy, findLazy } from "@webpack";
import { Button, Card, Forms, React, Select, Slider, Switch, useRef } from "@webpack/common";
import { ComponentType, Ref, SyntheticEvent } from "react";

import { SoundOverride, SoundPlayer, SoundType } from "../types";

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;

const AUDIO_FORMATS = {
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "m4a": "audio/mp4",
    "aac": "audio/aac",
    "flac": "audio/flac",
    "ogg": "audio/ogg",
    "webm": "audio/webm",
    "wma": "audio/x-ms-wma",
    "mp4": "audio/mp4",
} as const;

const AUDIO_EXTENSIONS = Object.keys(AUDIO_FORMATS);

const playSound: (id: string) => SoundPlayer = findByCodeLazy(".playWithListener().then");
const FileInput: FileInput = findLazy(m => m.prototype?.activateUploadDialogue && m.prototype.setRef);
const cl = classNameFactory("vc-custom-sounds-");

const isValidAudioUrl = (url: string) => {
    if (!url) return false;
    if (url.startsWith("data:audio/")) return true;
    return AUDIO_EXTENSIONS.some(ext => url.toLowerCase().endsWith(`.${ext}`));
};

const processUrl = (url: string) => {
    if (!url) return "";
    // Handle GitHub URLs
    if (url.includes("github.com") && !url.includes("raw.githubusercontent.com")) {
        return url.replace("github.com", "raw.githubusercontent.com")
            .replace("/blob/", "/");
    }
    // If it's a valid audio URL, use it as is
    if (AUDIO_EXTENSIONS.some(ext => url.toLowerCase().endsWith(`.${ext}`))) {
        return url;
    }
    return "";
};

const readFileAsAudio = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Force the MIME type to be audio/mpeg regardless of original format
            // This tricks Discord into treating it like an MP3
            const base64Data = result.split(",")[1];
            resolve(`data:audio/mpeg;base64,${base64Data}`);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export function SoundOverrideComponent({ type, override, onChange, overrides }: {
    type: SoundType;
    override: SoundOverride;
    onChange: () => Promise<void>;
    overrides: Record<string, SoundOverride>;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sound = useRef<SoundPlayer | null>(null);
    const update = useForceUpdater();

    const soundOptions = [
        { value: "default", label: "Default" },
    ];

    // Additional Options
    if (type.seasonal) {
        if (type.seasonal.includes("call_ringing_beat")) {
            soundOptions.push({ value: "call_ringing_beat", label: "Beat (Rare)" });
        }
        if (type.seasonal.some(id => id.startsWith("halloween_"))) {
            soundOptions.push({ value: "halloween", label: "Halloween" });
        }
        if (type.seasonal.some(id => id.startsWith("winter_"))) {
            soundOptions.push({ value: "winter", label: "Winter" });
        }
        if (type.seasonal.includes("call_ringing_snow_halation")) {
            soundOptions.push({ value: "call_ringing_snow_halation", label: "Snow Halation" });
        }
        if (type.seasonal.includes("call_ringing_snowsgiving")) {
            soundOptions.push({ value: "call_ringing_snowsgiving", label: "Snowsgiving" });
        }
    }

    // Add "Custom" at the end
    soundOptions.push({ value: "custom", label: "Custom" });

    const [selectedSound, setSelectedSound] = React.useState({
        value: override.selectedSound ?? "default",
        label: soundOptions.find(opt => opt.value === (override.selectedSound ?? "default"))?.label ?? "Default"
    });

    const renderSoundUploader = (currentOverride: SoundOverride) => (
        <>
            <Forms.FormTitle>Replacement Sound</Forms.FormTitle>
            <div className={Margins.bottom16}>
                <Button
                    color={Button.Colors.PRIMARY}
                    disabled={!override.enabled}
                    className={classes(Margins.right8, cl("upload"))}
                >
                    Upload Audio File
                    <FileInput
                        ref={fileInputRef}
                        onChange={async event => {
                            event.stopPropagation();
                            event.preventDefault();
                            if (!event.currentTarget?.files?.length) return;
                            try {
                                const file = event.currentTarget.files[0];
                                const audioDataUrl = await readFileAsAudio(file);
                                currentOverride.url = audioDataUrl;
                                onChange();
                                update();
                            } catch (err) {
                                console.error("Failed to read audio file:", err);
                            }
                        }}
                        filters={[{ name: "Audio Files", extensions: AUDIO_EXTENSIONS }]}
                    />
                </Button>
                <Button
                    color={Button.Colors.RED}
                    onClick={() => {
                        currentOverride.url = "";
                        onChange();
                        update();
                    }}
                    disabled={!(override.enabled && currentOverride.url.length !== 0)}
                    style={{ display: "inline" }}
                >
                    Clear
                </Button>
            </div>
            <Forms.FormText className={Margins.bottom8}>
                <input
                    type="text"
                    value={currentOverride.url?.startsWith("data:") ? "" : currentOverride.url}
                    onChange={e => {
                        const processedUrl = processUrl(e.target.value);
                        currentOverride.url = processedUrl;
                        onChange();
                        update();
                    }}
                    placeholder="Or paste a link to an audio file (.mp3, .wav, .ogg, etc.)"
                    className={classes(Margins.bottom16, cl("url-input"))}
                />
            </Forms.FormText>
            <Forms.FormTitle>Volume</Forms.FormTitle>
            <Slider
                markers={makeRange(0, 100, 10)}
                initialValue={currentOverride.volume}
                onValueChange={value => {
                    currentOverride.volume = value;
                    onChange();
                    update();
                }}
                className={Margins.bottom16}
                disabled={!override.enabled}
            />
        </>
    );

    const getSeasonalId = (season: string) => {
        if (!type.seasonal) return null;
        return type.seasonal.find(id => id.startsWith(`${season}_`));
    };

    const previewSound = () => {
        if (sound.current != null)
            sound.current.stop();

        if (selectedSound.value === "default") {
            sound.current = playSound(type.id);
        } else if (selectedSound.value === "halloween" || selectedSound.value === "winter") {
            const soundId = getSeasonalId(selectedSound.value);
            if (soundId) sound.current = playSound(soundId);
        } else if (["call_ringing_beat", "call_ringing_snow_halation", "call_ringing_snowsgiving"].includes(selectedSound.value)) {
            sound.current = playSound(selectedSound.value);
        } else if (selectedSound.value === "custom" && override.enabled) {
            const processedUrl = processUrl(override.url);
            if (isValidAudioUrl(processedUrl) || processedUrl.startsWith("data:")) {
                const audio = new Audio(processedUrl);
                audio.volume = override.volume / 100;
                audio.play();
                sound.current = {
                    play: () => audio.play(),
                    pause: () => audio.pause(),
                    stop: () => { audio.pause(); audio.currentTime = 0; },
                    loop: () => { audio.loop = true; }
                };
            } else {
                sound.current = playSound(type.id);
            }
        }
    };

    return (
        <Card className={cl("card")}>
            <Switch
                value={override.enabled}
                onChange={value => {
                    override.enabled = value;
                    onChange();
                    update();
                }}
                className={Margins.bottom16}
                hideBorder={true}
            >
                {type.name} <span className={cl("id")}>({type.id})</span>
            </Switch>

            <>
                <Button
                    color={Button.Colors.PRIMARY}
                    className={Margins.bottom16}
                    onClick={previewSound}
                >
                    Preview
                </Button>

                <Forms.FormTitle>Sound Type</Forms.FormTitle>
                <Select
                    options={soundOptions}
                    select={value => {
                        const option = soundOptions.find(opt => opt.value === value) ?? soundOptions[0];
                        setSelectedSound(option);
                        override.selectedSound = option.value;
                        if (option.value === "default") {
                            override.url = ""; // Clear custom sound if "Default" is selected
                        }
                        onChange();
                        update();
                    }}
                    isSelected={value => value === selectedSound.value}
                    serialize={option => option.value}
                    className={Margins.bottom16}
                />

                {selectedSound.value === "custom" && renderSoundUploader(override)}
            </>
        </Card>
    );
}
