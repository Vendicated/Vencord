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

import { Button } from "@components/Button";
import { Logger } from "@utils/Logger";
import { useFluxSubscription } from "@utils/react";
import { MediaEngineStore, useRef, useState } from "@webpack/common";

import type { VoiceRecorder } from ".";
import { settings } from "./settings";
import { webmToOgg } from "./webmToOgg";

const OGG_OPUS = "audio/ogg; codecs=opus";

async function tryRemux(webm: Blob) {
    try {
        return webmToOgg(await webm.arrayBuffer());
    } catch (e) {
        new Logger("VoiceMessages").error("Failed to remux WebM to Ogg, falling back to WebM", e);
        return webm;
    }
}

export const VoiceRecorderWeb: VoiceRecorder = ({ setAudioBlob, onRecordingChange }) => {
    const [recording, setRecording] = useState(false);
    const [paused, setPaused] = useState(false);
    const [recorder, setRecorder] = useState<MediaRecorder>();
    const [chunks, setChunks] = useState<Blob[]>([]);
    const closed = useRef(false);

    useFluxSubscription("VENCORD_STOP_RECORDING", () => {
        closed.current = true;
        stopRecording();
    });

    function changeRecording(recording: boolean) {
        setRecording(recording);
        onRecordingChange?.(recording);
    }

    function stopRecording() {
        if (recording && recorder) {
            recorder.addEventListener("stop", async () => {
                const blob = new Blob(chunks, { type: recorder.mimeType });
                setAudioBlob(blob.type.startsWith("audio/webm") ? await tryRemux(blob) : blob);

                changeRecording(false);
            });
            recorder.stop();
            recorder.stream.getTracks().forEach(track => track.stop());
        }
    }


    function toggleRecording() {
        const nowRecording = !recording;

        if (nowRecording) {
            navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: settings.store.echoCancellation,
                    noiseSuppression: settings.store.noiseSuppression,
                    deviceId: MediaEngineStore.getInputDeviceId()
                }
            }).then(stream => {
                // mic permission can resolve after the modal has closed
                if (closed.current) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                const chunks = [] as Blob[];
                setChunks(chunks);

                // Chromium can't record Ogg, so record WebM and remux it on stop
                const recorder = new MediaRecorder(stream, {
                    mimeType: MediaRecorder.isTypeSupported(OGG_OPUS) ? OGG_OPUS : "audio/webm; codecs=opus"
                });
                setRecorder(recorder);
                recorder.addEventListener("dataavailable", e => {
                    chunks.push(e.data);
                });
                recorder.start();

                changeRecording(true);
            });
        } else {
            stopRecording();
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
