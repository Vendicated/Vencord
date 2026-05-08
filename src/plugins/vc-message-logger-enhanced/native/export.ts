/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { randomUUID } from "node:crypto";
import { createWriteStream, WriteStream } from "node:fs";

import { dialog, IpcMainInvokeEvent } from "electron";

const activeStreams = new Map<string, WriteStream>();

export async function startNativeLogExport(_event: IpcMainInvokeEvent, filename: string) {
    const { filePath, canceled } = await dialog.showSaveDialog({
        defaultPath: filename ?? "message-logger-logs-idb.json",
        filters: [{ name: "JSON", extensions: ["json"] }]
    });

    if (canceled || !filePath)
        throw new Error("No file path selected");

    const stream = createWriteStream(filePath, { flags: "w", encoding: "utf-8" });

    const streamId = randomUUID();
    activeStreams.set(streamId, stream);

    stream.on("error", err => {
        console.error("Stream error", err);
        activeStreams.delete(streamId);
    });

    return streamId;
}

export async function writeNativeLogChunk(_event: IpcMainInvokeEvent, streamId: string, chunk: string) {
    const stream = activeStreams.get(streamId);
    if (!stream) throw new Error("Stream not found or closed");

    // if returns false, buffer is full; wait for drain to prevent RAM spike
    const canContinue = stream.write(chunk);
    if (!canContinue) {
        await new Promise<void>(resolve => stream.once("drain", resolve));
    }
}

export async function finishNativeLogExport(_event: IpcMainInvokeEvent, streamId: string) {
    const stream = activeStreams.get(streamId);
    if (!stream) return;

    return new Promise<void>(resolve => {
        stream.end(() => {
            activeStreams.delete(streamId);
            resolve();
        });
    });
}
