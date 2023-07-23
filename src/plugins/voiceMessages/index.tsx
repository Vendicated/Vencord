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

import "./styles.css";

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Flex } from "@components/Flex";
import { Microphone } from "@components/Icons";
import { Devs } from "@utils/constants";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { chooseFile } from "@utils/web";
import { findLazy } from "@webpack";
import { Button, Forms, Menu, PermissionsBits, PermissionStore, RestAPI, SelectedChannelStore, showToast, SnowflakeUtils, Toasts, useEffect, useRef, useState } from "@webpack/common";
import { ComponentType } from "react";

import { VoiceRecorderDesktop } from "./DesktopRecorder";
import { VoiceRecorderWeb } from "./WebRecorder";

const CloudUpload = findLazy(m => m.prototype?.uploadFileToCloud);

export type VoiceRecorder = ComponentType<{ setAudioBlob(blob: Blob): void; }>;

const VoiceRecorder = IS_DISCORD_DESKTOP ? VoiceRecorderDesktop : VoiceRecorderWeb;

export default definePlugin({
    name: "VoiceMessages",
    description: "Allows you to send voice messages like on mobile. To do so, right click the upload button and click Send Voice Message",
    authors: [Devs.Ven],

    start() {
        addContextMenuPatch("channel-attach", ctxMenuPatch);
    },

    stop() {
        removeContextMenuPatch("channel-attach", ctxMenuPatch);
    }
});

function sendAudio(audio: HTMLAudioElement, blob: Blob) {
    const channelId = SelectedChannelStore.getChannelId();

    const upload = new CloudUpload({
        file: new File([blob], "voice-message.ogg", { type: "audio/ogg; codecs=opus" }),
        isClip: false,
        isThumbnail: false,
        platform: 1,
    }, channelId, false, 0);

    upload.on("complete", () => {
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
    upload.on("error", () => showToast("Failed to upload voice message", Toasts.Type.FAILURE));

    upload.upload();
}

function useObjectUrl() {
    const [url, setUrl] = useState<string>();
    const setWithFree = (blob: Blob) => {
        if (url)
            URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(blob));
    };

    return [url, setWithFree] as const;
}

function Modal({ modalProps }: { modalProps: ModalProps; }) {
    const [blob, setBlob] = useState<Blob>();
    const [blobUrl, setBlobUrl] = useObjectUrl();
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => () => {
        if (blobUrl)
            URL.revokeObjectURL(blobUrl);
    }, [blobUrl]);

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle>Record Voice Message</Forms.FormTitle>
            </ModalHeader>

            <ModalContent className="vc-vmsg-modal">
                <div className="vc-vmsg-buttons">
                    <VoiceRecorder
                        setAudioBlob={blob => {
                            setBlob(blob);
                            setBlobUrl(blob);
                        }}
                    />

                    <Button
                        onClick={async () => {
                            const file = await chooseFile("audio/*");
                            if (file) {
                                setBlob(file);
                                setBlobUrl(file);
                            }
                        }}
                    >
                        Upload File
                    </Button>
                </div>

                <Forms.FormTitle>Preview</Forms.FormTitle>
                <audio ref={audioRef} src={blobUrl} controls />

            </ModalContent>

            <ModalFooter>
                <Button
                    disabled={!blob}
                    onClick={() => {
                        const audio = audioRef.current;
                        if (!audio || isNaN(audio.duration)) return showToast("No valid audio file selected", Toasts.Type.FAILURE);

                        sendAudio(audioRef.current!, blob!);
                        modalProps.onClose();
                        showToast("Now sending voice message... Please be patient", Toasts.Type.MESSAGE);
                    }}
                >
                    Send
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
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
            action={() => openModal(modalProps => <Modal modalProps={modalProps} />)}
        />
    );
};

