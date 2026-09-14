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

import { Button, MediaEngineStore, showToast, Toasts, useEffect, useRef, useState } from "@webpack/common";

import type { VoiceRecorder } from ".";
import { settings } from "./settings";
import { OggOpusRecording, startOggOpusRecording } from "./webRecording";

export const VoiceRecorderWeb: VoiceRecorder = ({ setAudioBlob, onRecordingChange }) => {
    const [recording, setRecording] = useState(false);
    const [paused, setPaused] = useState(false);
    const [busy, setBusy] = useState(false);
    const sessionRef = useRef<OggOpusRecording | null>(null);

    const changeRecording = (recording: boolean) => {
        setRecording(recording);
        onRecordingChange?.(recording);
    };

    useEffect(() => () => {
        sessionRef.current?.stop().catch(() => { });
        sessionRef.current = null;
    }, []);

    function toggleRecording() {
        if (busy) return;

        if (!recording) {
            setBusy(true);
            navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: settings.store.echoCancellation,
                    noiseSuppression: settings.store.noiseSuppression,
                    deviceId: MediaEngineStore.getInputDeviceId()
                }
            }).then(async stream => {
                try {
                    sessionRef.current = await startOggOpusRecording(stream);
                    setPaused(false);
                    changeRecording(true);
                } catch (error) {
                    stream.getTracks().forEach(track => track.stop());
                    showToast(error instanceof Error ? error.message : "Failed to start recording", Toasts.Type.FAILURE);
                }
            }).catch(() => showToast("Failed to start recording", Toasts.Type.FAILURE))
                .finally(() => setBusy(false));
        } else {
            const session = sessionRef.current;
            if (!session) return;
            sessionRef.current = null;
            setBusy(true);
            session.stop().then(blob => {
                setAudioBlob(blob);
            }).catch(error => {
                showToast(error instanceof Error ? error.message : "Failed to finish recording", Toasts.Type.FAILURE);
            }).finally(() => {
                setPaused(false);
                changeRecording(false);
                setBusy(false);
            });
        }
    }

    return (
        <>
            <Button disabled={busy} onClick={toggleRecording}>
                {recording ? "Stop" : "Start"} recording
            </Button>

            <Button
                disabled={!recording || busy}
                onClick={() => {
                    const session = sessionRef.current;
                    if (!session) return;
                    if (paused) session.resume();
                    else session.pause();
                    setPaused(!paused);
                }}
            >
                {paused ? "Resume" : "Pause"} recording
            </Button>
        </>
    );
};
