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
import { definePluginSettings } from "@api/Settings";
import { Card } from "@components/Card";
import { Heading } from "@components/Heading";
import { Microphone } from "@components/Icons";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { lastState as silentMessageEnabled } from "@plugins/silentMessageToggle";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile } from "@utils/web";
import { CloudUpload } from "@vencord/discord-types";
import { CloudUploadPlatform } from "@vencord/discord-types/enums";
import { findByPropsLazy, findLazy, findStoreLazy } from "@webpack";
import { Button, Constants, FluxDispatcher, Forms, lodash, Menu, MessageActions, PermissionsBits, PermissionStore, RestAPI, SelectedChannelStore, showToast, SnowflakeUtils, Toasts, useEffect, useState } from "@webpack/common";

import { VoiceRecorderDesktop } from "./components/DesktopRecorder";
import { VoicePreview } from "./components/VoicePreview";
import { VoiceRecorderWeb } from "./components/WebRecorder";

const VOICE_MESSAGE_FLAG = 1 << 13;
const SILENT_MESSAGE_FLAG = 4096;
const DEFAULT_WAVEFORM = "AAAAAAAAAAAA";
const DEFAULT_DURATION = 1;
const WAVEFORM_MIN_BINS = 32;
const WAVEFORM_MAX_BINS = 256;
const WAVEFORM_BINS_PER_SECOND = 10;
const WAVEFORM_MAX_VALUE = 0xFF;

const EMPTY_META: AudioMetadata = {
    waveform: DEFAULT_WAVEFORM,
    duration: DEFAULT_DURATION,
};

const CloudUploadConstructor = findLazy(m => m.prototype?.trackUploadFinished) as typeof CloudUpload;
const PendingReplyStore = findStoreLazy("PendingReplyStore");
const OptionClasses = findByPropsLazy("optionName", "optionIcon", "optionLabel");

export const cl = classNameFactory("vc-vmsg-");

export type VoiceRecorder = React.ComponentType<{
    setAudioBlob(blob: Blob): void;
    onRecordingChange?(recording: boolean): void;
}>;

type AudioMetadata = {
    waveform: string,
    duration: number,
};

function generateWaveform(audioBuffer: AudioBuffer): string {
    const channelData = audioBuffer.getChannelData(0);
    const binCount = lodash.clamp(
        Math.floor(audioBuffer.duration * WAVEFORM_BINS_PER_SECOND),
        Math.min(WAVEFORM_MIN_BINS, channelData.length),
        WAVEFORM_MAX_BINS
    );

    const bins = new Uint8Array(binCount);
    const samplesPerBin = Math.floor(channelData.length / binCount);

    for (let binIdx = 0; binIdx < binCount; binIdx++) {
        let sum = 0;
        for (let sampleIdx = 0; sampleIdx < samplesPerBin; sampleIdx++) {
            const offset = binIdx * samplesPerBin + sampleIdx;
            sum += channelData[offset + sampleIdx] ** 2;
        }
        bins[binIdx] = Math.floor(Math.sqrt(sum / samplesPerBin) * WAVEFORM_MAX_VALUE);
    }

    const maxBin = Math.max(...bins);
    if (maxBin) {
        const easing = Math.min(1, 100 * (maxBin / WAVEFORM_MAX_VALUE) ** 3);
        const ratio = 1 + (WAVEFORM_MAX_VALUE / maxBin - 1) * easing;
        for (let i = 0; i < binCount; i++) {
            bins[i] = Math.min(WAVEFORM_MAX_VALUE, Math.floor(bins[i] * ratio));
        }
    }

    return window.btoa(String.fromCharCode(...bins));
}

function sendAudio(blob: Blob, meta: AudioMetadata) {
    const channelId = SelectedChannelStore.getChannelId();
    const reply = PendingReplyStore.getPendingReply(channelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });

    const upload = new CloudUploadConstructor({
        file: new File([blob], "voice-message.ogg", { type: "audio/ogg; codecs=opus" }),
        isThumbnail: false,
        platform: CloudUploadPlatform.WEB,
    }, channelId);

    upload.on("complete", () => {
        RestAPI.post({
            url: Constants.Endpoints.MESSAGES(channelId),
            body: {
                flags: VOICE_MESSAGE_FLAG | (silentMessageEnabled ? SILENT_MESSAGE_FLAG : 0),
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
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(blob));
    };

    return [url, setWithFree] as const;
}

const ctxMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const hasPermission = !props.channel.guild_id
        || (PermissionStore.can(PermissionsBits.SEND_VOICE_MESSAGES, props.channel) && PermissionStore.can(PermissionsBits.SEND_MESSAGES, props.channel));

    children.push(
        <Menu.MenuItem
            id="vc-send-vmsg"
            label={
                <div className={OptionClasses.optionLabel}>
                    <Microphone className={OptionClasses.optionIcon} height={24} width={24} />
                    <div className={OptionClasses.optionName}>
                        Send Voice Message
                        {!hasPermission && <span style={{ fontSize: "smaller", opacity: 0.6 }}> (Missing Permissions)</span>}
                    </div>
                </div>
            }
            action={() => openModal(modalProps => <Modal modalProps={modalProps} />)}
            disabled={!hasPermission}
        />
    );
};

function Modal({ modalProps }: { modalProps: ModalProps; }) {
    const [isRecording, setRecording] = useState(false);
    const [blob, setBlob] = useState<Blob>();
    const [blobUrl, setBlobUrl] = useObjectUrl();

    const VoiceRecorder = IS_DISCORD_DESKTOP ? VoiceRecorderDesktop : VoiceRecorderWeb;

    useEffect(() => () => {
        if (blobUrl)
            URL.revokeObjectURL(blobUrl);
    }, [blobUrl]);

    const [meta, metaError] = useAwaiter(async () => {
        if (!blob) return EMPTY_META;

        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());

        return {
            waveform: generateWaveform(audioBuffer),
            duration: audioBuffer.duration,
        };
    }, {
        deps: [blob],
        fallbackValue: EMPTY_META,
    });

    const isUnsupportedFormat = blob && (!blob.type.startsWith("audio/ogg") || blob.type.includes("codecs") && !blob.type.includes("opus"));

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Heading>Record Voice Message</Heading>
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

                    <Button onClick={async () => {
                        const file = await chooseFile("audio/*");
                        if (file) {
                            setBlob(file);
                            setBlobUrl(file);
                        }
                    }}>
                        Upload File
                    </Button>
                </div>

                <Heading>Preview</Heading>
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

                        <Paragraph className={Margins.top8}>
                            To fix it, first convert it to OggOpus, for example using the <Link href="https://convertio.co/mp3-opus/">convertio web converter</Link>
                        </Paragraph>
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
                    }}>
                    Send
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export const settings = definePluginSettings({
    noiseSuppression: {
        type: OptionType.BOOLEAN,
        description: "Noise Suppression",
        default: true,
    },
    echoCancellation: {
        type: OptionType.BOOLEAN,
        description: "Echo Cancellation",
        default: true,
    },
});

export default definePlugin({
    name: "VoiceMessages",
    description: "Allows you to send voice messages like on mobile. To do so, right click the upload button and click Send Voice Message.",
    authors: [Devs.Ven, Devs.Vap, Devs.Nickyux, EquicordDevs.Z1xus, EquicordDevs.Prism],
    settings,

    contextMenus: {
        "channel-attach": ctxMenuPatch
    }
});
