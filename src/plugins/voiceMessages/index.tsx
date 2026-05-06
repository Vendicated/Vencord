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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Card } from "@components/Card";
import { Microphone } from "@components/Icons";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import definePlugin from "@utils/types";
import { chooseFile } from "@utils/web";
import { CloudUpload as TCloudUpload } from "@vencord/discord-types";
import { CloudUploadPlatform } from "@vencord/discord-types/enums";
import { findLazy } from "@webpack";
import { Button, ChannelStore, Constants, FluxDispatcher, Forms, lodash, Menu, MessageActions, PendingReplyStore, PermissionsBits, PermissionStore, RestAPI, SelectedChannelStore, showToast, SnowflakeUtils, Toasts, useEffect, useRef, useState } from "@webpack/common";
import { ComponentType } from "react";

import { VoiceRecorderDesktop } from "./DesktopRecorder";
import { settings } from "./settings";
import { VoicePreview } from "./VoicePreview";
import { VoiceRecorderWeb } from "./WebRecorder";

const CloudUpload: typeof TCloudUpload = findLazy(m => m.prototype?.trackUploadFinished);

export const cl = classNameFactory("vc-vmsg-");
export type VoiceRecorder = ComponentType<{
    setAudioBlob(blob: Blob): void;
    onRecordingChange?(recording: boolean): void;
    autoStart?: boolean;
    stopSignal?: number;
}>;

export interface VoiceMessageProps {
    src: string;
    waveform: string;
}
export let VoiceMessage: ComponentType<VoiceMessageProps> = () => null;

const VoiceRecorder = IS_DISCORD_DESKTOP ? VoiceRecorderDesktop : VoiceRecorderWeb;

const ctxMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (props.channel.guild_id && !(PermissionStore.can(PermissionsBits.SEND_VOICE_MESSAGES, props.channel) && PermissionStore.can(PermissionsBits.SEND_MESSAGES, props.channel))) return;

    children.push(
        <Menu.MenuItem
            id="vc-send-vmsg"
            iconLeft={Microphone}
            leadingAccessory={{
                type: "icon",
                icon: Microphone
            }}
            label="Send Voice Message"
            action={() => openModal(modalProps => <Modal modalProps={modalProps} />)}
        />
    );
};

function onKeydown(e: KeyboardEvent) {
    if (!settings.store.keybind) return;
    if (e.key !== "v" && e.key !== "V") return;
    if (!e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;

    const channelId = SelectedChannelStore.getChannelId();
    if (!channelId) return;
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return;
    if (channel.guild_id && !(PermissionStore.can(PermissionsBits.SEND_VOICE_MESSAGES, channel) && PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel))) return;

    e.preventDefault();
    openModal(modalProps => <Modal modalProps={modalProps} autoStart />);
}

export default definePlugin({
    name: "VoiceMessages",
    description: "Allows you to send voice messages like on mobile. Right click the upload button or press Alt+V to record, then Alt+B to send.",
    tags: ["Voice", "Shortcuts"],
    authors: [Devs.Ven, Devs.Vap, Devs.Nickyux],
    settings,

    patches: [
        {
            find: "#{intl::PAUSE_VOICE_MESSAGE_A11Y_LABEL}",
            replacement: {
                match: /(?<=\i=)(?=\i\.memo\(.{0,50}?=1,onVolumeChange:[^}]+?waveform:[^}]+?playbackCacheKey:)/,
                replace: "$self.VoiceMessage=",
            }
        }
    ],

    set VoiceMessage(value) {
        VoiceMessage = value;
    },

    contextMenus: {
        "channel-attach": ctxMenuPatch
    },

    start() {
        document.addEventListener("keydown", onKeydown);
    },

    stop() {
        document.removeEventListener("keydown", onKeydown);
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
    const reply = PendingReplyStore.getPendingReply(channelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });

    const upload = new CloudUpload({
        file: new File([blob], "voice-message.ogg", { type: "audio/ogg; codecs=opus" }),
        isThumbnail: false,
        platform: CloudUploadPlatform.WEB,
    }, channelId);

    upload.on("complete", () => {
        RestAPI.post({
            url: Constants.Endpoints.MESSAGES(channelId),
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
                }],
                message_reference: reply ? MessageActions.getSendMessageOptionsForReply(reply)?.messageReference : null,
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

function Modal({ modalProps, autoStart }: { modalProps: ModalProps; autoStart?: boolean; }) {
    const [isRecording, setRecording] = useState(false);
    const [blob, setBlob] = useState<Blob>();
    const [blobUrl, setBlobUrl] = useObjectUrl();
    const [stopSignal, setStopSignal] = useState(0);
    const pendingSendRef = useRef(false);

    useEffect(() => () => {
        if (blobUrl)
            URL.revokeObjectURL(blobUrl);
    }, [blobUrl]);

    const [meta, metaError] = useAwaiter(async () => {
        if (!blob) return EMPTY_META;

        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
        const channelData = audioBuffer.getChannelData(0);

        // average the samples into much lower resolution bins, maximum of 256 total bins
        const bins = new Uint8Array(lodash.clamp(Math.floor(audioBuffer.duration * 10), Math.min(32, channelData.length), 256));
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

    const isUnsupportedFormat = blob && (
        !blob.type.startsWith("audio/ogg")
        || blob.type.includes("codecs") && !blob.type.includes("opus")
    );

    const doSend = () => {
        if (!blob) return;
        sendAudio(blob, meta ?? EMPTY_META);
        modalProps.onClose();
        showToast("Now sending voice message... Please be patient", Toasts.Type.MESSAGE);
    };

    useEffect(() => {
        if (!pendingSendRef.current) return;
        if (!blob || meta === EMPTY_META) return;
        pendingSendRef.current = false;
        doSend();
    }, [blob, meta]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (!settings.store.keybind) return;
            if (e.key !== "b" && e.key !== "B") return;
            if (!e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
            e.preventDefault();

            if (isRecording) {
                pendingSendRef.current = true;
                setStopSignal(s => s + 1);
            } else if (blob) {
                doSend();
            }
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isRecording, blob, meta]);

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
                        autoStart={autoStart}
                        stopSignal={stopSignal}
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
                {metaError
                    ? <Paragraph className={cl("error")}>Failed to parse selected audio file: {metaError.message}</Paragraph>
                    : (
                        <VoicePreview
                            src={blobUrl}
                            waveform={meta.waveform}
                            recording={isRecording}
                        />
                    )}

                {isUnsupportedFormat && (
                    <Card variant="warning" className={Margins.top16} defaultPadding>
                        <Forms.FormText>Voice Messages have to be OggOpus to be playable on iOS. This file is <code>{blob.type}</code> so it will not be playable on iOS.</Forms.FormText>

                        <Forms.FormText className={Margins.top8}>
                            To fix it, first convert it to OggOpus, for example using the <Link href="https://convertio.co/mp3-opus/">convertio web converter</Link>
                        </Forms.FormText>
                    </Card>
                )}

            </ModalContent>

            <ModalFooter>
                <Button
                    disabled={!blob}
                    onClick={() => {
                        sendAudio(blob!, meta ?? EMPTY_META);
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
