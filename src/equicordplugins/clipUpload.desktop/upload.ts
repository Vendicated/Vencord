/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { isObject } from "@utils/misc";
import type { PluginNative } from "@utils/types";
import type { User } from "@vencord/discord-types";
import { Constants, MediaEngineStore, RestAPI, showToast, SnowflakeUtils } from "@webpack/common";

import { convertClipToMp4 } from "./ffmpeg";
const logger = new Logger("ClipUpload");

const Native = VencordNative.pluginHelpers.ClipUpload as PluginNative<typeof import("./native")>;

const defaultFileName = "clip.mp4";
const compatibleExtensions = [".mp4", ".m4v"];
const uploadAbortControllers = new Set<AbortController>();

export interface ClipMetadata {
    name?: string;
    applicationId?: unknown;
    createdAt?: number | string | Date;
    users?: User[];
    remoteClipId?: string | number;
    eventsTimeline?: unknown;
}

export interface ClipUploadOptions {
    fileName: string;
    participants: string[];
    title: string;
    spoiler: boolean;
    remix: boolean;
    thumbnail: boolean;
    createdAt: string;
    message: string;
    channelId: string;
    applicationId?: string;
    remoteClipId?: string;
    eventsTimeline?: unknown;
    messageReference?: {
        message_id: string;
        channel_id: string;
        guild_id?: string;
    };
}

interface AttachmentUploadResponse {
    attachments?: Array<{
        upload_url: string;
        upload_filename: string;
    }>;
}

interface RestResponse {
    ok?: boolean;
    body?: unknown;
    text?: string;
}

interface ClipMetadataUpdater {
    updateClipMetadata(clipId: string, metadata: string): Promise<void>;
}

export function getString(value: unknown) {
    return typeof value === "string" ? value : undefined;
}

export function abortActiveClipUploads() {
    for (const controller of uploadAbortControllers) {
        controller.abort();
    }
    uploadAbortControllers.clear();
}

export function getClipTitleFromName(name: string) {
    const extensionStart = name.lastIndexOf(".");
    return extensionStart > 0 ? name.slice(0, extensionStart) : name;
}

export function getDefaultClipTitle(clip?: ClipMetadata | null) {
    return typeof clip?.name === "string" ? clip.name.trim() : "";
}

export function getClipCreatedAt(clip?: ClipMetadata | null) {
    const { createdAt } = clip ?? {};

    if (createdAt instanceof Date) return createdAt.toISOString();
    if (typeof createdAt === "number") return new Date(createdAt).toISOString();
    if (typeof createdAt === "string") {
        const date = new Date(createdAt);
        if (!Number.isNaN(date.getTime())) return date.toISOString();
    }

    return new Date().toISOString();
}

export function getParticipantIds(clip?: ClipMetadata | null): string[] {
    if (!Array.isArray(clip?.users)) return [];

    return clip.users.flatMap(user => {
        if (typeof user === "string") return user;
        if (isObject(user) && typeof user.id === "string") return user.id;
        return [];
    });
}

export function isValidDate(value: string) {
    return Boolean(value.trim()) && !Number.isNaN(new Date(value).getTime());
}

export function getDefaultFileName() {
    return defaultFileName;
}

function getFileExtension(fileName: string) {
    return fileName.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase() ?? ".mp4";
}

function getTempVideoFileName(fileName: string) {
    if (compatibleExtensions.includes(getFileExtension(fileName))) return fileName;

    return `${getClipTitleFromName(fileName) || defaultFileName}.mp4`;
}

async function readStampedVideoFile(token: string, name: string, type: string) {
    const tmpToken = await Native.createTempVideoFile(token);
    if (!tmpToken) throw new Error("Couldn't prepare the selected file.");

    try {
        await updateTempVideoMetadata(tmpToken);

        const data = await Native.readVideoFile(tmpToken);
        if (!data) throw new Error("Couldn't read the selected file.");

        return new File([new Uint8Array(data)], name, { type });
    } finally {
        await Native.deleteTempVideoFile(tmpToken);
    }
}

async function updateTempVideoMetadata(tmpToken: string) {
    // We need the absolute path here because Discord's MediaEngineStore requires it
    // and it is a renderer-only module, so this cannot be done in the main process.
    const tmpPath = await Native.getTempVideoFilePath(tmpToken);
    if (!tmpPath) throw new Error("Couldn't prepare the selected file.");

    const mediaEngine = MediaEngineStore.getMediaEngine();
    if (!isClipMetadataUpdater(mediaEngine)) throw new Error("Couldn't update clip metadata.");

    await mediaEngine.updateClipMetadata(tmpPath, "{}");
}

async function stampVideoFile(file: File, fileName: string) {
    const tmpToken = await Native.createTempVideoFileFromBytes(getTempVideoFileName(fileName), new Uint8Array(await file.arrayBuffer()));
    if (!tmpToken) throw new Error("Couldn't prepare the selected file.");

    try {
        await updateTempVideoMetadata(tmpToken);

        const data = await Native.readVideoFile(tmpToken);
        if (!data) throw new Error("Couldn't read the selected file.");

        return new File([new Uint8Array(data)], fileName, { type: "video/mp4" });
    } finally {
        await Native.deleteTempVideoFile(tmpToken);
    }
}

function isClipMetadataUpdater(value: unknown): value is ClipMetadataUpdater {
    return isObject(value) && typeof (value as { updateClipMetadata?: unknown; }).updateClipMetadata === "function";
}

export interface ParsedClipMetadata {
    id?: string;
    applicationId?: string;
    applicationName?: string;
    users?: string[];
    version?: number;
}

export async function pickClipFile(parseFileMetadata: boolean) {
    const picked = await Native.chooseVideoFile();
    if (!picked) return null;

    let metadata: ParsedClipMetadata | null = null;
    if (parseFileMetadata) {
        const result = await Native.parseClipFileMetadata(picked.token);
        metadata = result?.[0] ?? null;
    }

    const file = await readStampedVideoFile(picked.token, picked.name, picked.type);

    return { file, metadata };
}

function isCompatibleClipFile(file: File) {
    return file.type === "video/mp4" || compatibleExtensions.includes(getFileExtension(file.name));
}

function prepareClipFile(file: File, fileName: string) {
    if (isCompatibleClipFile(file)) {
        return new File([file], fileName, { type: file.type || "video/mp4" });
    }
    throw new Error("This file is not compatible. Use an MP4 clip with H.264 video and AAC audio.");
}

function parseAttachmentUploadResponse(response: RestResponse): AttachmentUploadResponse {
    if (isObject(response.body)) return response.body as AttachmentUploadResponse;
    return parseJSON<AttachmentUploadResponse>(response.text) ?? {};
}

async function reserveClipUpload(options: ClipUploadOptions, file: File) {
    const response = await RestAPI.post({
        url: Constants.Endpoints.MESSAGE_CREATE_ATTACHMENT_UPLOAD(options.channelId),
        body: {
            content: options.message,
            files: [{
                filename: options.fileName,
                file_size: file.size,
                id: "0",
                is_clip: true,
                is_spoiler: options.spoiler,
                is_remix: options.remix,
                is_thumbnail: options.thumbnail,
                title: options.title,
                application_id: options.applicationId,
                clip_created_at: options.createdAt,
                clip_participant_ids: options.participants,
                clip_remote_id: options.remoteClipId,
                clip_events_timeline: options.eventsTimeline,
                original_content_type: file.type || "video/mp4"
            }]
        }
    }) as RestResponse;

    return parseAttachmentUploadResponse(response).attachments?.[0];
}

async function uploadReservedClip(attachment: NonNullable<Awaited<ReturnType<typeof reserveClipUpload>>>, uploadFile: File) {
    const uploadAbortController = new AbortController();
    uploadAbortControllers.add(uploadAbortController);

    try {
        const uploadResponse = await fetch(attachment.upload_url, {
            method: "PUT",
            body: uploadFile,
            signal: uploadAbortController.signal,
            referrer: "https://discord.com/",
            referrerPolicy: "strict-origin-when-cross-origin",
            mode: "cors",
            credentials: "omit"
        });

        if (!uploadResponse.ok) throw new Error("Upload failed.");
    } finally {
        uploadAbortControllers.delete(uploadAbortController);
    }
}

async function sendClipUpload(uploadFile: File, options: ClipUploadOptions) {
    const attachment = await reserveClipUpload(options, uploadFile);
    if (!attachment) throw new Error("Discord did not return an upload slot.");

    await uploadReservedClip(attachment, uploadFile);

    const messageResponse = await RestAPI.post({
        url: Constants.Endpoints.MESSAGES(options.channelId),
        body: {
            content: options.message,
            nonce: SnowflakeUtils.fromTimestamp(Date.now()),
            channel_id: options.channelId,
            sticker_ids: [],
            type: 0,
            attachments: [{
                id: "0",
                filesize: uploadFile.size,
                filename: options.fileName,
                uploaded_filename: attachment.upload_filename,
                is_clip: true,
                is_spoiler: options.spoiler,
                is_remix: options.remix,
                is_thumbnail: options.thumbnail,
                title: options.title,
                application_id: options.applicationId,
                clip_created_at: options.createdAt,
                clip_participant_ids: options.participants,
                clip_remote_id: options.remoteClipId,
                clip_events_timeline: options.eventsTimeline
            }],
            message_reference: options.messageReference,
        }
    }) as RestResponse;

    if (messageResponse.ok === false) throw messageResponse;
}

function getSearchableErrorText(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    if (!isObject(error)) return "";

    const { body, message, text } = error as { body?: unknown; message?: unknown; text?: unknown; };
    return [
        typeof message === "string" ? message : "",
        typeof text === "string" ? text : "",
        typeof body === "string" ? body : "",
        isObject(body) ? JSON.stringify(body) : ""
    ].join("\n");
}

function getRestErrorCode(error: unknown) {
    if (!isObject(error)) return undefined;

    const { body } = error as { body?: unknown; };
    if (!isObject(body)) return undefined;

    const { code } = body as Record<string, unknown>;
    return typeof code === "number" ? code : undefined;
}

function shouldRetryWithFFmpeg(error: unknown) {
    const errorText = getSearchableErrorText(error).toLowerCase();
    return getRestErrorCode(error) === 50174 || errorText.includes("not a valid clip");
}

export async function uploadClipFile(file: File, options: ClipUploadOptions) {
    try {
        showToast({ text: "Checking clip file." });

        const uploadFile = await prepareClipFile(file, options.fileName);

        try {
            await sendClipUpload(uploadFile, options);
        } catch (error) {
            if (!shouldRetryWithFFmpeg(error)) throw error;

            showToast({ text: "Converting clip file." });
            await sendClipUpload(await stampVideoFile(await convertClipToMp4(file, options.fileName), options.fileName), options);
        }

        showToast({ text: "Clip uploaded.", variant: "success" });
        return true;
    } catch (error) {
        logger.error(error);
        showToast({ text: getErrorMessage(error), variant: "critical" });
        return false;
    }
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof DOMException && error.name === "AbortError") return "Upload canceled.";
    if (error instanceof Error) return error.message;
    return "Failed to upload clip.";
}

function parseJSON<T>(text?: string): T | null {
    if (!text) return null;
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}
