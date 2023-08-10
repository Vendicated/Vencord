/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, useState } from "@webpack/common";

import type { VoiceRecorder } from ".";
import { settings } from "./settings";

export const VoiceRecorderWeb: VoiceRecorder = ({ setAudioBlob, onRecordingChange }) => {
    const [recording, setRecording] = useState(false);
    const [paused, setPaused] = useState(false);
    const [recorder, setRecorder] = useState<MediaRecorder>();
    const [chunks, setChunks] = useState<Blob[]>([]);

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
                }
            }).then(stream => {
                const chunks = [] as Blob[];
                setChunks(chunks);

                const recorder = new MediaRecorder(stream);
                setRecorder(recorder);
                recorder.addEventListener("dataavailable", e => {
                    chunks.push(e.data);
                });
                recorder.start();

                changeRecording(true);
            });
        } else {
            if (recorder) {
                recorder.addEventListener("stop", () => {
                    setAudioBlob(new Blob(chunks, { type: "audio/ogg; codecs=opus" }));

                    changeRecording(false);
                });
                recorder.stop();
            }
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
