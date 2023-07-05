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

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Flex } from "@components/Flex";
import { Microphone } from "@components/Icons";
import { Devs } from "@utils/constants";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { findLazy } from "@webpack";
import { Button, Forms, Menu, PermissionsBits, PermissionStore, RestAPI, SelectedChannelStore, SnowflakeUtils, useEffect, useRef, useState } from "@webpack/common";

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

function Modal({ modalProps }: { modalProps: ModalProps; }) {
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
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle>Record Voice Message</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Flex>
                    <Button onClick={() => setRecording(!recording)}>
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
                </Flex>

                <Forms.FormTitle>Preview</Forms.FormTitle>
                <audio ref={audioRef} src={url} controls />

            </ModalContent>

            <ModalFooter>
                <Button
                    disabled={!blob}
                    onClick={() => sendAudio(audioRef.current!, blob!)}
                >
                    Send
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

function openRecordModal() {
    openModal(modalProps => <Modal modalProps={modalProps} />);
}

const ctxMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    if (props.channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_VOICE_MESSAGES, props.channel)) return;

    children.push(
        <Menu.MenuItem
            id="vc-send-vmsg"
            label={
                <>
                    <Flex flexDirection="row" style={{ alignItems: "center", gap: 8 }}>
                        <Microphone height={24} width={24} />
                        Send voice message
                    </Flex>
                </>
            }
            action={() => openRecordModal()}
        />
    );
};

export default definePlugin({
    name: "VoiceMessages",
    description: "Send voice messages",
    authors: [Devs.Ven],

    start() {
        addContextMenuPatch("channel-attach", ctxMenuPatch);
    },

    stop() {
        removeContextMenuPatch("channel-attach", ctxMenuPatch);
    }
});
