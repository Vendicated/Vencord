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

import { addAccessory } from "@api/MessageAccessories";
import { Devs } from "@utils/constants";
import { ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { findLazy } from "@webpack";
import { Button, RestAPI, SelectedChannelStore, SnowflakeUtils, useEffect, useRef, useState } from "@webpack/common";

const CloudUpload = findLazy(m => m.prototype?.uploadFileToCloud);

function sendAudio(audio: HTMLAudioElement, blob: Blob) {
    const channelId = SelectedChannelStore.getChannelId();

    const upload = new CloudUpload({
        file: new File([blob], "audio.ogg", { type: "audio/ogg; codecs=opus" }),
        isClip: false,
        isThumbnail: false,
        platform: 1,
    }, channelId, false, 0);

    upload.on("complete", () => {
        console.log("Uploaded audio");
        RestAPI.post({
            url: `/channels/${channelId}/messages`,
            body: {
                flags: 1 << 13,
                channel_id: channelId,
                content: "",
                nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                sticker_ids: [],
                type: 0,
                attachments: [{
                    id: "0",
                    filename: upload.filename,
                    uploaded_filename: upload.uploadedFilename,
                    waveform: "AEtWPyUaGA4OEAcA", // TODO
                    duration_secs: audio.duration || 1
                }]
            }
        });
    });

    upload.upload();
}

function Modal() {
    const [recording, setRecording] = useState(false);
    const [paused, setPaused] = useState(false);
    const [recorder, setRecorder] = useState<MediaRecorder>();
    const [blob, setBlob] = useState<Blob>();
    const [url, setUrl] = useState<string>();
    const [chunks, setChunks] = useState<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (recording) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                const chunks = [] as Blob[];
                setChunks(chunks);

                const recorder = new MediaRecorder(stream);
                setRecorder(recorder);
                recorder.addEventListener("dataavailable", e => {
                    chunks.push(e.data);
                });
                recorder.start();
            });
        } else {
            if (recorder) {
                recorder.addEventListener("stop", () => {
                    const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
                    setBlob(blob);
                    setUrl(URL.createObjectURL(blob));
                });
                recorder.stop();
            }
        }
    }, [recording]);

    return (
        <div>
            <Button onClick={() => setRecording(!recording)}>
                {recording ? "Stop" : "Start"} recording
            </Button>
            <Button onClick={() => {
                setPaused(!paused);
                if (paused) recorder?.resume();
                else recorder?.pause();
            }}>
                {paused ? "Resume" : "Pause"} recording
            </Button>

            {url && (
                <>
                    <audio ref={audioRef} src={url} controls />
                    <Button onClick={() => sendAudio(audioRef.current!, blob!)}>Send</Button>
                </>
            )}
        </div>
    );
}

function openRecordModal() {
    openModal(modalProps => (
        <ModalRoot {...modalProps}>
            <Modal />
        </ModalRoot>
    ));
}

export default definePlugin({
    name: "VoiceMessages",
    description: "Send voice messages",
    authors: [Devs.Ven],

    start() {
        addAccessory("explod", () => <Button onClick={openRecordModal}>Record</Button>);
    },
});
