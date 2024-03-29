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

import { Button, useState } from "@webpack/common";
import Recorder from "opus-recorder";

import type { VoiceRecorder } from ".";
import { settings } from "./settings";
let url:string|null = null;
export const VoiceRecorderWeb: VoiceRecorder = ({ setAudioBlob, onRecordingChange }) => {
    const [recording, setRecording] = useState(false);
    const [paused, setPaused] = useState(false);
    const [recorder, setRecorder] = useState<Recorder>();
    const [chunks, setChunks] = useState<Blob[]>([]);
    const [stream, setStream] = useState<MediaStream>();

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
            }).then(async stream => {
                const chunks = [] as Blob[];
                setChunks(chunks);
                setStream(stream);
                const audioCtx = new AudioContext();
                const source = audioCtx.createMediaStreamSource(stream);
                if (!url){
                    const blob = await (await fetch("https://www.unpkg.com/opus-recorder@8.0.5/dist/encoderWorker.min.js")).blob();
                    url = URL.createObjectURL(blob);
                }
                const recorder = new Recorder({ sourceNode: source, encoderPath: url, streamPages: true });
                setRecorder(recorder);
                recorder.ondataavailable=e => {
                    chunks.push(new Blob([e], { type: "audio/ogg; codecs=opus" }));
                };
                recorder.start();
                changeRecording(true);
            });
        } else {
            if (recorder) {
                recorder.onstop=() => {
                    setAudioBlob(new Blob(chunks, { type: "audio/ogg; codecs=opus" }));
                    changeRecording(false);
                };
                recorder.stop();
                stream?.getAudioTracks().forEach(track => track.stop());
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
