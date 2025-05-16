/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { PluginNative } from "@utils/types";
import { Button, showToast, Toasts, useState } from "@webpack/common";

import type { VoiceRecorder } from ".";
import { settings } from "./settings";
import { MediaEngineStore } from "./utils";

const Native = VencordNative.pluginHelpers.VoiceMessages as PluginNative<typeof import("./native")>;

export const VoiceRecorderDesktop: VoiceRecorder = ({ setAudioBlob, onRecordingChange }) => {
    const [recording, setRecording] = useState(false);

    const changeRecording = (recording: boolean) => {
        setRecording(recording);
        onRecordingChange?.(recording);
    };

    function toggleRecording() {
        const discordVoice = DiscordNative.nativeModules.requireModule("discord_voice");
        const nowRecording = !recording;

        if (nowRecording) {
            discordVoice.startLocalAudioRecording(
                {
                    echoCancellation: settings.store.echoCancellation,
                    noiseCancellation: settings.store.noiseSuppression,
                    deviceId: MediaEngineStore.getInputDeviceId(),
                },
                (success: boolean) => {
                    if (success)
                        changeRecording(true);
                    else
                        showToast("Failed to start recording", Toasts.Type.FAILURE);
                }
            );
        } else {
            discordVoice.stopLocalAudioRecording(async (filePath: string) => {
                if (filePath) {
                    const buf = await Native.readRecording(filePath);
                    if (buf)
                        setAudioBlob(new Blob([buf], { type: "audio/ogg; codecs=opus" }));
                    else
                        showToast("Failed to finish recording", Toasts.Type.FAILURE);
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
