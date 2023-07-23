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

import { Button, showToast, Toasts, useState } from "@webpack/common";

import type { VoiceRecorder } from ".";

export const VoiceRecorderDesktop: VoiceRecorder = ({ setBlob, setBlobUrl }) => {
    const [recording, setRecording] = useState(false);

    function toggleRecording() {
        const discordVoice = DiscordNative.nativeModules.requireModule("discord_voice");
        const nowRecording = !recording;

        if (nowRecording) {
            discordVoice.startLocalAudioRecording(
                {
                    echoCancellation: true,
                    noiseSuppression: true,
                    noiseCancellation: true
                },
                (success: boolean) => {
                    if (success) setRecording(true);
                    else showToast("Failed to start recording", Toasts.Type.FAILURE);
                }
            );
        } else {
            discordVoice.stopLocalAudioRecording(async (filePath: string) => {
                if (filePath) {
                    const buf = await VencordNative.pluginHelpers.VoiceMessages.readRecording();
                    if (buf) {
                        const blob = new Blob([buf], { type: "audio/ogg; codecs=opus" });
                        setBlob(blob);
                        setBlobUrl(blob);
                    } else showToast("Failed to finish recording", Toasts.Type.FAILURE);
                }
                setRecording(false);
            });
        }
    }

    return (
        <Button onClick={toggleRecording}>
            {recording ? "Stop" : "Start"} recording
        </Button>
    );
};
