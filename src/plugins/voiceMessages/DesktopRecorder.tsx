/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginNative } from "@utils/types";
import { Button, showToast, Toasts, useState } from "@webpack/common";

import type { VoiceRecorder } from ".";
import { settings } from "./settings";
import { MediaEngineStore } from "./utils";

const Native = VencordNative.pluginHelpers.VoiceMessages as PluginNative<
    typeof import("./native")
>;

export const VoiceRecorderDesktop: VoiceRecorder = ({
    setAudioBlob,
    onRecordingChange,
}) => {
    const [recording, setRecording] = useState(false);

    const changeRecording = (recording: boolean) => {
        setRecording(recording);
        onRecordingChange?.(recording);
    };

    function toggleRecording() {
        const discordVoice =
            DiscordNative.nativeModules.requireModule("discord_voice");
        const nowRecording = !recording;

        if (nowRecording) {
            discordVoice.startLocalAudioRecording(
                {
                    echoCancellation: settings.store.echoCancellation,
                    noiseCancellation: settings.store.noiseSuppression,
                    deviceId: MediaEngineStore.getInputDeviceId(),
                },
                (success: boolean) => {
                    if (success) changeRecording(true);
                    else
                        showToast(
                            "Failed to start recording",
                            Toasts.Type.FAILURE,
                        );
                },
            );
        } else {
            discordVoice.stopLocalAudioRecording(async (filePath: string) => {
                if (filePath) {
                    const buf = await Native.readRecording(filePath);
                    if (buf)
                        setAudioBlob(
                            new Blob([buf], { type: "audio/ogg; codecs=opus" }),
                        );
                    else
                        showToast(
                            "Failed to finish recording",
                            Toasts.Type.FAILURE,
                        );
                }
                changeRecording(false);
            });
        }
    }

    return (
        <Button onClick={toggleRecording}>
            {recording ? "Stop" : "Start"} recording
        </Button>
    );
};
