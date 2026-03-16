/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openPrivateChannel, sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { sleep } from "@utils/misc";
import { chooseFile } from "@utils/web";
import { CloudUpload } from "@vencord/discord-types";
import { CloudUploadPlatform } from "@vencord/discord-types/enums";
import { findLazy } from "@webpack";
import { ChannelStore, Constants, RestAPI, SnowflakeUtils } from "@webpack/common";

const logger = new Logger("CommandPaletteSendMessage");

const CloudUploader = findLazy(m => m.prototype?.trackUploadFinished) as typeof CloudUpload;

async function waitForDmChannel(userId: string, timeoutMs = 2500): Promise<string | null> {
    const existing = ChannelStore.getDMFromUserId?.(userId) ?? null;
    if (existing) return existing;

    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const next = ChannelStore.getDMFromUserId?.(userId) ?? null;
        if (next) return next;

        await sleep(80);
    }

    return null;
}

async function pickFilesFromDisk(): Promise<File[]> {
    if (typeof document === "undefined") return [];
    const file = await chooseFile("*/*");
    return file ? [file] : [];
}

async function uploadAttachment(channelId: string, file: File, index: number): Promise<{ id: string; filename: string; uploaded_filename: string; } | null> {
    return new Promise(resolve => {
        const upload = new CloudUploader({ file, platform: CloudUploadPlatform.WEB }, channelId);

        upload.on("complete", () => {
            resolve({
                id: String(index),
                filename: upload.filename,
                uploaded_filename: upload.uploadedFilename
            });
        });

        upload.on("error", () => {
            resolve(null);
        });

        upload.upload();
    });
}

async function postMessageWithAttachments(channelId: string, content: string, files: File[]) {
    const uploaded = await Promise.all(files.map((file, index) => uploadAttachment(channelId, file, index)));
    const attachments = uploaded.filter((entry): entry is { id: string; filename: string; uploaded_filename: string; } => Boolean(entry));

    if (attachments.length !== files.length) {
        throw new Error("One or more attachments failed to upload.");
    }

    await RestAPI.post({
        url: Constants.Endpoints.MESSAGES(channelId),
        body: {
            content,
            nonce: SnowflakeUtils.fromTimestamp(Date.now()),
            channel_id: channelId,
            sticker_ids: [],
            type: 0,
            attachments
        }
    });
}

async function sendToChannel(channelId: string, content: string, useFilePicker: boolean | undefined, silent: boolean | undefined) {
    const bodyContent = silent ? `@silent ${content}` : content;

    if (!useFilePicker) {
        await sendMessage(channelId, { content: bodyContent });
        return;
    }

    const files = await pickFilesFromDisk();
    if (files.length === 0) {
        throw new Error("No files selected.");
    }

    try {
        await postMessageWithAttachments(channelId, bodyContent, files);
    } catch (error) {
        logger.error("Failed sending message with attachments", error);
        throw error;
    }
}

export async function sendMessageToUser(options: { userId: string; content: string; useFilePicker?: boolean; silent?: boolean; }) {
    const { userId, content, useFilePicker, silent } = options;

    if (!userId) throw new Error("User target is required.");
    if (!content.trim()) throw new Error("Message content is required.");

    openPrivateChannel(userId);
    const channelId = await waitForDmChannel(userId, 3000);

    if (!channelId) {
        throw new Error("Unable to open a DM with that user.");
    }

    await sendToChannel(channelId, content, useFilePicker, silent);
}

export async function sendMessageToChannel(options: { channelId: string; content: string; useFilePicker?: boolean; silent?: boolean; }) {
    const { channelId, content, useFilePicker, silent } = options;

    if (!channelId) throw new Error("Channel target is required.");
    if (!content.trim()) throw new Error("Message content is required.");

    await sendToChannel(channelId, content, useFilePicker, silent);
}
