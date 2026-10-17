/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import type { RenderModalProps } from "@vencord/discord-types";
import { Checkbox, FluxDispatcher, MessageActions, Modal, openModal, PendingReplyStore, showToast, useEffect, useState } from "@webpack/common";

import { ApplicationField, BooleanField, DateTimeField, getDateTimeLocalValue, ParticipantField, TextField } from "./fields";
import { abortActiveClipUploads, type ClipMetadata, getClipCreatedAt, getClipTitleFromName, getDefaultClipTitle, getDefaultFileName, getErrorMessage, getParticipantIds, getString, isValidDate, pickClipFile, uploadClipFile } from "./upload";

export function openUploadClipFileModal(channelId: string, clip?: ClipMetadata | null) {
    openModal(modalProps => (
        <UploadClipFileModal
            modalProps={modalProps}
            channelId={channelId}
            clip={clip}
        />
    ));
}

function UploadClipFileModal({ modalProps, channelId, clip }: { modalProps: RenderModalProps; channelId: string; clip?: ClipMetadata | null; }) {
    const defaultFileName = getDefaultFileName();
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState(defaultFileName);
    const [participants, setParticipants] = useState(getParticipantIds(clip));
    const [title, setTitle] = useState(getDefaultClipTitle(clip));
    const [spoiler, setSpoiler] = useState(false);
    const [remix, setRemix] = useState(false);
    const [thumbnail, setThumbnail] = useState(false);
    const [createdAt, setCreatedAt] = useState(getDateTimeLocalValue(getClipCreatedAt(clip)));
    const [message, setMessage] = useState("");
    const [applicationId, setApplicationId] = useState(getString(clip?.applicationId) ?? "");
    const [uploading, setUploading] = useState(false);
    const [parseMetadata, setParseMetadata] = useState(false);

    const canUpload = Boolean(file && fileName.trim() && title.trim() && isValidDate(createdAt)) && !uploading;
    const notice = createdAt && !isValidDate(createdAt)
        ? { message: "Created at must be a valid date.", type: "critical" as const }
        : undefined;

    useEffect(() => abortActiveClipUploads, []);

    async function chooseClipFile() {
        let result;
        try {
            result = await pickClipFile(parseMetadata);
            if (!result) return;
        } catch (error) {
            showToast({ text: getErrorMessage(error), variant: "critical" });
            return;
        }

        const { file: picked, metadata } = result;

        setFile(picked);
        setFileName(name => name === defaultFileName ? picked.name : name);

        const appName = metadata?.applicationName;
        const appUsers = metadata?.users;
        const appId = metadata?.applicationId;

        setTitle(currentTitle => appName || currentTitle || getClipTitleFromName(picked.name));

        if (appUsers?.length) setParticipants(current => current.length ? current : appUsers);
        if (appId) setApplicationId(current => current || appId);
    }

    async function submit() {
        if (!file || !canUpload) return;

        setUploading(true);

        const reply = PendingReplyStore.getPendingReply(channelId);
        if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });

        const success = await uploadClipFile(file, {
            fileName: fileName.trim(),
            participants,
            title: title.trim(),
            spoiler,
            remix,
            thumbnail,
            createdAt: new Date(createdAt).toISOString(),
            message,
            channelId,
            applicationId: applicationId.trim() || undefined,
            remoteClipId: getString(clip?.remoteClipId),
            eventsTimeline: clip?.eventsTimeline,
            messageReference: reply ? MessageActions.getSendMessageOptionsForReply(reply)?.messageReference : null,
        });

        if (success) {
            modalProps.onClose();
            return;
        }

        setUploading(false);
    }

    return (
        <Modal
            {...modalProps}
            title="Upload Clip File"
            notice={notice}
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: modalProps.onClose,
                    disabled: uploading
                },
                {
                    text: uploading ? "Uploading" : "Upload",
                    variant: "primary",
                    onClick: () => void submit(),
                    disabled: !canUpload
                }
            ]}
        >
            <Flex flexDirection="column" gap={12}>
                <section>
                    <Heading tag="h5">File</Heading>
                    <Flex alignItems="center" gap={8}>
                        <Button onClick={() => void chooseClipFile()} disabled={uploading}>
                            Select File
                        </Button>
                        <Paragraph>{file?.name ?? "No file selected"}</Paragraph>
                    </Flex>
                    <Checkbox
                        value={parseMetadata}
                        onChange={(_event, checked) => setParseMetadata(checked)}
                        disabled={uploading}
                        type="row"
                    >
                        Parse clip metadata from file
                    </Checkbox>
                </section>

                <TextField title="File name" value={fileName} onChange={setFileName} placeholder="my_clip.mp4" disabled={uploading} />
                <TextField title="Title" value={title} onChange={setTitle} placeholder="Epic Moment" disabled={uploading} />
                <ParticipantField value={participants} onChange={setParticipants} disabled={uploading} />
                <DateTimeField value={createdAt} onChange={setCreatedAt} disabled={uploading} />
                <TextField title="Message" value={message} onChange={setMessage} placeholder="Check out this clip!" disabled={uploading} multiline />
                <ApplicationField value={applicationId} onChange={setApplicationId} disabled={uploading} />

                <Flex flexDirection="column" gap={8}>
                    <BooleanField label="Spoiler" value={spoiler} onChange={setSpoiler} disabled={uploading} />
                    <BooleanField label="Remix" value={remix} onChange={setRemix} disabled={uploading} />
                    <BooleanField label="Thumbnail" value={thumbnail} onChange={setThumbnail} disabled={uploading} />
                </Flex>
            </Flex>
        </Modal>
    );
}
