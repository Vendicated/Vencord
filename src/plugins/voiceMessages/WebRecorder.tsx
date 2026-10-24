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

import { Button, MediaEngineStore, useEffect, useRef, useState } from "@webpack/common";

import type { VoiceRecorder } from ".";
import { settings } from "./settings";

export const VoiceRecorderWeb: VoiceRecorder = ({ setAudioBlob, onRecordingChange }) => {
    const [recording, setRecording] = useState(false);
    const [paused, setPaused] = useState(false);
    const [starting, setStarting] = useState(false);
    const [recorder, setRecorder] = useState<MediaRecorder>();
    const session = useRef<AbortController | null>(null);

    // cancelling the session also covers microphone permission resolving after close
    useEffect(() => () => session.current?.abort(), []);

    const changeRecording = (recording: boolean) => {
        setRecording(recording);
        onRecordingChange?.(recording);
    };

    async function toggleRecording() {
        function stopTracks(stream: MediaStream) {
            for (const track of stream.getTracks()) track.stop();
        }

        if (recording) {
            if (recorder!.state !== "inactive") recorder!.stop();
            stopTracks(recorder!.stream);
            return;
        }

        // keep one session before React renders the disabled Start button
        if (session.current) return;
        const controller = new AbortController();
        session.current = controller;
        setStarting(true);

        let stream: MediaStream | undefined;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: settings.store.echoCancellation,
                    noiseSuppression: settings.store.noiseSuppression,
                    deviceId: MediaEngineStore.getInputDeviceId()
                }
            });

            if (controller.signal.aborted) {
                stopTracks(stream);
                return;
            }

            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            let failed = false;
            recorder.addEventListener("dataavailable", e => chunks.push(e.data));

            // stop still fires after an error, so reset the session in that handler
            recorder.addEventListener("error", () => {
                failed = true;
                stopTracks(recorder.stream);
            });

            controller.signal.addEventListener("abort", () => {
                if (recorder.state !== "inactive") recorder.stop();
                stopTracks(recorder.stream);
            }, { once: true });

            recorder.addEventListener("stop", () => {
                stopTracks(recorder.stream);

                // closing the modal discards its recording without updating unmounted state
                if (controller.signal.aborted) return;
                session.current = null;
                setRecorder(undefined);
                setPaused(false);
                changeRecording(false);

                if (!failed) setAudioBlob(new Blob(chunks, { type: "audio/ogg; codecs=opus" }));
            });

            recorder.start();
            setRecorder(recorder);
            changeRecording(true);
        } catch {
            // dont leave the mic running if starting the recorder fails
            if (stream) stopTracks(stream);
            if (!controller.signal.aborted) session.current = null;
        } finally {
            if (!controller.signal.aborted) setStarting(false);
        }
    }

    return (
        <>
            <Button onClick={toggleRecording} disabled={starting}>
                {recording ? "Stop" : "Start"} recording
            </Button>

            <Button
                disabled={!recording}
                onClick={() => {
                    // stop() makes the recorder inactive before its stop event updates the UI
                    if (recorder?.state === "paused") {
                        recorder.resume();
                        setPaused(false);
                    } else if (recorder?.state === "recording") {
                        recorder.pause();
                        setPaused(true);
                    }
                }}
            >
                {paused ? "Resume" : "Pause"} recording
            </Button>
        </>
    );
};
