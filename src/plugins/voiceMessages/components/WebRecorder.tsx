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

import { Button, MediaEngineStore, useState } from "@webpack/common";

import { settings, type VoiceRecorder } from "..";

export const VoiceRecorderWeb: VoiceRecorder = ({ setAudioBlob, onRecordingChange }) => {
    const [recording, setRecording] = useState(false);
    const [paused, setPaused] = useState(false);
    const [recorder, setRecorder] = useState<MediaRecorder>();

    const changeRecording = (recording: boolean) => {
        setRecording(recording);
        onRecordingChange?.(recording);
    };

    function toggleRecording() {
        const nowRecording = !recording;

        if (nowRecording) {
            navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: settings.store.echoCancellation,
                    noiseSuppression: settings.store.noiseSuppression,
                    deviceId: MediaEngineStore.getInputDeviceId()
                }
            }).then(mediaStream => {
                const chunks: Blob[] = [];

                const recorder = new MediaRecorder(mediaStream);
                setRecorder(recorder);

                const handleDataAvailable = (e: BlobEvent) => {
                    chunks.push(e.data);
                };

                const handleStop = () => {
                    setAudioBlob(new Blob(chunks, { type: "audio/ogg; codecs=opus" }));
                    changeRecording(false);

                    recorder.removeEventListener("dataavailable", handleDataAvailable);
                    recorder.removeEventListener("stop", handleStop);

                    mediaStream.getTracks().forEach(track => track.stop());
                };

                recorder.addEventListener("dataavailable", handleDataAvailable);
                recorder.addEventListener("stop", handleStop, { once: true });
                recorder.start();

                changeRecording(true);
            });
        } else {
            recorder?.stop();
        }
    }

    return (
        <>
            <Button onClick={toggleRecording}>
                {recording ? "Stop" : "Start"} recording
            </Button>

            <Button
                disabled={!recording}
                onClick={() => {
                    setPaused(!paused);
                    if (paused) recorder?.resume();
                    else recorder?.pause();
                }}
            >
                {paused ? "Resume" : "Pause"} recording
            </Button>
        </>
    );
};
