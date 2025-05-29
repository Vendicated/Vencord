/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, FluxDispatcher, Forms, PresenceStore, React, RelationshipStore, TextInput, UserStore } from "@webpack/common";

interface SoundPickerProps {
    setValue: (value: any) => void;
    setError?: (error: boolean) => void;
    option: any;
    value?: any;
}

interface SoundData {
    dataUrl: string;
    fileName: string;
}

// Add back the style for the input wrapper
const style = `
.vc-bms-file-flex .inputWrapper__0f084 {
    flex: auto !important;
    min-width: 0 !important;
}
`;

function SimpleSoundPicker({ setValue, option, value }: SoundPickerProps) {
    const [currentFile, setCurrentFile] = React.useState<string | null>(null);
    const [fileName, setFileName] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // On mount, check if there's already a file set in settings
    React.useEffect(() => {
        // Log for debugging
        console.log("SimpleSoundPicker mounted with value:", value);

        // Try to get the saved value from settings or props
        try {
            // First check if we have a value in props
            if (value) {
                if (typeof value === "object" && value !== null &&
                    "fileName" in value && "dataUrl" in value) {
                    // We have a properly formatted object with both dataUrl and fileName
                    const soundData = value as SoundData;
                    console.log("Found object with fileName:", soundData.fileName);
                    setCurrentFile(soundData.dataUrl);
                    setFileName(soundData.fileName);
                } else if (typeof value === "string" && value.startsWith("data:")) {
                    // Legacy format - just the dataUrl
                    console.log("Found legacy dataUrl");
                    setCurrentFile(value);
                    setFileName("Sound File");
                }
            } else {
                // Fallback to directly checking settings
                const savedValue = settings.store.mp3Path;
                console.log("Checking settings directly:", typeof savedValue);

                if (savedValue) {
                    if (typeof savedValue === "object" && savedValue !== null &&
                        "fileName" in savedValue && "dataUrl" in savedValue) {
                        const soundData = savedValue as SoundData;
                        console.log("Found sound file in settings:", soundData.fileName);
                        setCurrentFile(soundData.dataUrl);
                        setFileName(soundData.fileName);
                    } else if (typeof savedValue === "string" && savedValue.startsWith("data:")) {
                        console.log("Found legacy dataUrl in settings");
                        setCurrentFile(savedValue);
                        setFileName("Sound File");
                    }
                }
            }
        } catch (e) {
            console.error("Error getting setting value:", e);
        }
    }, [value]);

    const handleFileChange = e => {
        const file = e.target.files[0];
        if (!file) return;

        console.log("File selected:", file.name);

        // Check file type
        if (!file.type.startsWith("audio/") && !file.name.toLowerCase().endsWith(".mp3")) {
            console.error("Invalid file type");
            return;
        }

        setFileName(file.name);

        // Read file as DataURL
        const reader = new FileReader();
        reader.onload = event => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
                console.log("File loaded, storing with filename");
                setCurrentFile(dataUrl);

                // Store both the dataUrl and fileName
                const soundData: SoundData = {
                    dataUrl,
                    fileName: file.name
                };

                setValue(soundData);
            }
        };
        reader.readAsDataURL(file);
    };

    const selectFile = () => {
        fileInputRef.current?.click();
    };

    // Log when the settings change
    React.useEffect(() => {
        try {
            const settingsValue = settings.store.mp3Path;
            console.log("[DEBUG] Settings changed:", {
                type: typeof settingsValue,
                hasDataUrl: typeof settingsValue === "object" && settingsValue !== null && "dataUrl" in settingsValue,
                hasFileName: typeof settingsValue === "object" && settingsValue !== null && "fileName" in settingsValue,
                isString: typeof settingsValue === "string",
                isDataUrl: typeof settingsValue === "string" && settingsValue?.startsWith("data:"),
                length: typeof settingsValue === "string" ? settingsValue?.length : "N/A"
            });
        } catch (e) {
            console.error("Error checking settings:", e);
        }
    }, []);

    // Inject style for input wrapper
    React.useEffect(() => {
        if (typeof document !== "undefined" && !document.getElementById("vc-bms-file-style") && document.head) {
            const styleTag = document.createElement("style");
            styleTag.id = "vc-bms-file-style";
            styleTag.textContent = style;
            document.head.appendChild(styleTag);
        }
    }, []);

    // Test sound playback
    const testSound = () => {
        if (currentFile) {
            console.log("Testing sound playback");
            const audio = new Audio(currentFile);
            audio.volume = 0.5; // Half volume for testing
            audio.play().catch(err => {
                console.error("Error playing test sound:", err);
            });
        }
    };

    // Clear the selected sound
    const clearSound = () => {
        console.log("Clearing sound file");
        setCurrentFile(null);
        setFileName(null);
        setValue(""); // Empty string will clear the setting
    };

    return (
        <div style={{ marginTop: 20 }}>
            {option.name && <Forms.FormTitle>{option.name}</Forms.FormTitle>}
            {option.description && <Forms.FormText>{option.description}</Forms.FormText>}

            <Flex className="vc-bms-file-flex" style={{ marginTop: 8 }}>
                <TextInput
                    value={fileName || "No file selected"}
                    disabled
                    placeholder="No file selected"
                />
                <Button onClick={selectFile}>
                    Select File
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="audio/*,.mp3"
                    onChange={handleFileChange}
                    title="Select sound file"
                    aria-label="Select sound file"
                />
            </Flex>
        </div>
    );
}

const settings = definePluginSettings({
    mp3Path: {
        name: "Sound File",
        description: "Select an MP3 file to play when a blocked user sends a message",
        type: OptionType.COMPONENT,
        component: props => <SimpleSoundPicker {...props} />,
        default: "",
        required: true,
        restartNeeded: false
    },
    volume: {
        name: "Volume",
        description: "Playback volume for the sound (0 = muted, 100 = max)",
        type: OptionType.SLIDER,
        min: 0,
        max: 100,
        default: 100,
        markers: [0, 25, 50, 75, 100],
        stickToMarkers: false
    },
    playInDnd: {
        name: "Play in Do Not Disturb",
        description: "Allow sound to play when your status is Do Not Disturb.",
        type: OptionType.BOOLEAN,
        default: false
    }
});

function playBlockedMessageSound() {
    const savedValue = settings.store.mp3Path;
    let mp3DataUrl: string | null = null;

    if (savedValue) {
        if (typeof savedValue === "object" && savedValue !== null && "dataUrl" in savedValue) {
            // New format with fileName
            mp3DataUrl = (savedValue as SoundData).dataUrl;
        } else if (typeof savedValue === "string" && savedValue.startsWith("data:")) {
            // Legacy format - just the dataUrl
            mp3DataUrl = savedValue;
        }
    }

    console.log("Attempting to play sound, data available:", !!mp3DataUrl);
    if (!mp3DataUrl) return;

    // Check DND status if needed
    if (!settings.store.playInDnd) {
        const user = UserStore.getCurrentUser();
        if (user && PresenceStore.getStatus(user.id) === "dnd") return;
    }

    const audio = new Audio(mp3DataUrl);
    audio.volume = (settings.store.volume ?? 100) / 100;
    audio.play().catch(err => {
        console.error("Error playing sound:", err);
    });
}

function onBlockedMessage({ message }) {
    if (!message || !message.author) return;
    if (RelationshipStore.isBlocked(message.author.id)) {
        playBlockedMessageSound();
    }
}

export default definePlugin({
    name: "BlockedMessageSound",
    description: "Plays a sound when a message is sent from a blocked user",
    authors: [Devs.Zekerocks11],
    settings,
    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", onBlockedMessage);
    },
    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onBlockedMessage);
    }
});
