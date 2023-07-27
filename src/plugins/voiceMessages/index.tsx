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
import { useAwaiter } from "@utils/react";
import definePlugin from "@utils/types";
import { chooseFile } from "@utils/web";
import { findLazy } from "@webpack";
import { Button, Forms, Menu, PermissionsBits, PermissionStore, RestAPI, SelectedChannelStore, showToast, SnowflakeUtils, Toasts, useEffect, useState } from "@webpack/common";
import { ComponentType } from "react";

import { VoiceRecorderDesktop } from "./DesktopRecorder";
import { settings } from "./settings";
import { cl } from "./utils";
import { VoicePreview } from "./VoicePreview";
import { VoiceRecorderWeb } from "./WebRecorder";

const CloudUpload = findLazy(m => m.prototype?.uploadFileToCloud);

export type VoiceRecorder = ComponentType<{
    setAudioBlob(blob: Blob): void;
    onRecordingChange?(recording: boolean): void;
}>;

const VoiceRecorder = IS_DISCORD_DESKTOP ? VoiceRecorderDesktop : VoiceRecorderWeb;

export default definePlugin({
    name: "VoiceMessages",
    description: "Allows you to send voice messages like on mobile. To do so, right click the upload button and click Send Voice Message",
    authors: [Devs.Ven, Devs.Vap],
    settings,

    start() {
        addContextMenuPatch("channel-attach", ctxMenuPatch);
    },

    stop() {
        removeContextMenuPatch("channel-attach", ctxMenuPatch);
    }
});

type AudioMetadata = {
    waveform: string,
    duration: number,
};
const EMPTY_META: AudioMetadata = {
    waveform: "AAAAAAAAAAAA",
    duration: 1,
};

function sendAudio(blob: Blob, meta: AudioMetadata) {
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
                    waveform: meta.waveform,
                    duration_secs: meta.duration,
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
    const [isRecording, setRecording] = useState(false);
    const [blob, setBlob] = useState<Blob>();
    const [blobUrl, setBlobUrl] = useObjectUrl();

    useEffect(() => () => {
        if (blobUrl)
            URL.revokeObjectURL(blobUrl);
    }, [blobUrl]);

    const [meta] = useAwaiter(async () => {
        if (!blob) return EMPTY_META;

        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
        const channelData = audioBuffer.getChannelData(0);

        // average the samples into much lower resolution bins, maximum of 256 total bins
        const bins = new Uint8Array(window._.clamp(Math.floor(audioBuffer.duration * 10), Math.min(32, channelData.length), 256));
        const samplesPerBin = Math.floor(channelData.length / bins.length);

        // Get root mean square of each bin
        for (let binIdx = 0; binIdx < bins.length; binIdx++) {
            let squares = 0;
            for (let sampleOffset = 0; sampleOffset < samplesPerBin; sampleOffset++) {
                const sampleIdx = binIdx * samplesPerBin + sampleOffset;
                squares += channelData[sampleIdx] ** 2;
            }
            bins[binIdx] = ~~(Math.sqrt(squares / samplesPerBin) * 0xFF);
        }

        // Normalize bins with easing
        const maxBin = Math.max(...bins);
        const ratio = 1 + (0xFF / maxBin - 1) * Math.min(1, 100 * (maxBin / 0xFF) ** 3);
        for (let i = 0; i < bins.length; i++) bins[i] = Math.min(0xFF, ~~(bins[i] * ratio));

        return {
            waveform: window.btoa(String.fromCharCode(...bins)),
            duration: audioBuffer.duration,
        };
    }, {
        deps: [blob],
        fallbackValue: EMPTY_META,
    });

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle>Record Voice Message</Forms.FormTitle>
            </ModalHeader>

            <ModalContent className={cl("modal")}>
                <div className={cl("buttons")}>
                    <VoiceRecorder
                        setAudioBlob={blob => {
                            setBlob(blob);
                            setBlobUrl(blob);
                        }}
                        onRecordingChange={setRecording}
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
                <VoicePreview
                    src={blobUrl}
                    waveform={meta.waveform}
                    recording={isRecording}
                />

            </ModalContent>

            <ModalFooter>
                <Button
                    disabled={!blob}
                    onClick={() => {
                        sendAudio(blob!, meta);
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

