/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { deleteChunks, getChunk, splitFile } from "./splitter";
import { downloadFile, sleep } from "./native";
import definePlugin from "@utils/types";
import { ChannelStore, FluxDispatcher, MessageActions, PrivateChannelsStore, Menu, RestAPI, SnowflakeUtils, UploadHandler, DraftType } from "@webpack/common";
const CloudUpload = findLazy(m => m.prototype?.trackUploadFinished);
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { findLazy } from "@webpack";
import { showNotification } from "@api/Notifications";

const RECEIVER_USER_ID = "1356734616194519170";
const logger = new Logger("UploadAsTorrent");
const TIMEOUT_MS = 5 * 60 * 1000;
const MAX_FILE_SIZE = 1024 * 1024 * 1024 * 500;
let currentUpload: { cancel: () => void; } | null = null;

async function switchToChannel(channelId: string) {
    FluxDispatcher.dispatch({
        type: "CHANNEL_SELECT",
        channelId: channelId,
        guildId: null
    });
    await sleep(300);
}

async function handleTorrentUpload(file: File, originalChannelId: string) {
    if (file.size > MAX_FILE_SIZE) {
        showNotification({
            title: "Upload Failed",
            body: "File is too large (max 500GB)",
            color: "var(--text-danger)"
        });
        return;
    }

    const sessionId = crypto.randomUUID();
    let botChannelId: string | null = null;
    document.body.style.cursor = "wait";
    let uploadedChunks = 0;
    let totalChunks = 0;
    let failedChunks = 0;
    let isCancelled = false;

    currentUpload = {
        cancel: () => {
            isCancelled = true;
            document.body.style.cursor = "";
            deleteChunks(sessionId).catch(() => null);
            if (botChannelId) MessageActions.sendMessage(botChannelId, { content: "stop" }).catch(() => null);
            switchToChannel(originalChannelId).catch(() => null);
        }
    };

    console.log(`[Torrent] Starting upload of ${file.name} (${file.size} bytes)`);

    try {
        botChannelId = await PrivateChannelsStore.getOrEnsurePrivateChannel(RECEIVER_USER_ID);
        if (!botChannelId || !ChannelStore.getChannel(botChannelId)) {
            throw new Error("Could not connect to torrent service. Try again later.");
        }

        await switchToChannel(botChannelId);
        await MessageActions.sendMessage(botChannelId, { content: "start" });

        console.log("[Torrent] Sent start command");

        for await (const _ of splitFile(file, sessionId)) totalChunks++;

        for await (const chunk of splitFile(file, sessionId)) {
            if (isCancelled) throw new Error("Upload cancelled");
            console.log(`[Torrent] Processing chunk ${chunk.index}/${totalChunks}`);
            const data = await getChunk(chunk.id);
            if (!data) {
                console.error(`[Torrent] Failed to get chunk ${chunk.index}`);
                failedChunks++;
                if (failedChunks > 3) {
                    throw new Error("Failed to process file chunks. Try uploading again.");
                }
                continue;
            }

            console.log(`[Torrent] Uploading chunk ${chunk.index}`);
            const chunkFile = new File([data], `${file.name}.part${chunk.index}`, { type: file.type });

            try {
                await new Promise<void>((resolve, reject) => {
                    const upload = new CloudUpload(
                        {
                            file: chunkFile,
                            isClip: false,
                            isThumbnail: false,
                            platform: 1,
                        },
                        botChannelId!,
                        false,
                        0
                    );

                    upload.on("complete", async () => {
                        try {
                            await RestAPI.post({
                                url: `/channels/${botChannelId}/messages`,
                                body: {
                                    attachments: [{
                                        id: "0",
                                        filename: upload.filename,
                                        uploaded_filename: upload.uploadedFilename,
                                    }],
                                    nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                                },
                            });
                            uploadedChunks++;

                            console.log(`[Torrent] Chunk ${chunk.index} uploaded successfully (${uploadedChunks}/${totalChunks})`);
                            resolve();
                        } catch (err) {
                            console.error(`[Torrent] Failed to send chunk ${chunk.index}:`, err);
                            reject(err);
                        }
                    });

                    upload.on("error", err => {
                        console.error(`[Torrent] Upload error for chunk ${chunk.index}:`, err);
                        reject(err);
                    });

                    upload.on("progress", (_progress: number) => {
                        // Implement progress tracking if needed
                    });

                    upload.upload();
                });
            } catch (err) {
                if (isCancelled) throw new Error("Upload cancelled");
                failedChunks++;
                if (failedChunks > 3) throw new Error("Too many failed chunks");
                console.error(`[Torrent] Chunk ${chunk.index} failed, retrying...`);
                uploadedChunks--;
                await sleep(1000);
            }
        }

        await sleep(2000);
        console.log(`[Torrent] All chunks uploaded (${uploadedChunks}/${totalChunks}), sending stop command`);

        await MessageActions.sendMessage(botChannelId, { content: "stop" });

        let cleanup: () => void;
        await new Promise<void>((resolve, reject) => {
            const onMessage = async (event: { message: any; optimistic: boolean; }) => {
                if (event.optimistic) return;
                const { message } = event;

                if (message?.author?.id === RECEIVER_USER_ID &&
                    message?.channel_id === botChannelId &&
                    message?.content?.includes("http")) {

                    cleanup();

                    const link = message.content;

                    try {
                        const torrentBlob = await downloadFile(link);
                        const torrentFile = new File([torrentBlob], `${file.name}.torrent`, { type: "application/x-bittorrent" });
                        UploadHandler.promptToUpload(
                            [torrentFile],
                            ChannelStore.getChannel(originalChannelId),
                            DraftType.ChannelMessage
                        );
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }
            };

            cleanup = () => {
                clearTimeout(timeout);
                FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
            };

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error("Torrent creation timed out."));
            }, TIMEOUT_MS);

            FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
        });

        await switchToChannel(originalChannelId);

    } catch (e) {
        document.body.style.cursor = "";
        const message = e instanceof Error ? e.message : "Unknown error occurred while uploading";
        showNotification({
            title: "Upload Failed",
            body: message,
            color: "var(--text-danger)"
        });
        if (botChannelId && !isCancelled) await MessageActions.sendMessage(botChannelId, { content: "stop" });
        await switchToChannel(originalChannelId);
        throw e;
    } finally {
        currentUpload = null;
        document.body.style.cursor = "";
        await deleteChunks(sessionId).catch(() => null);
    }
}

function TorrentIcon({ className }: { className?: string; }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path fill="currentColor" d="M13.82 21.7c.17.05.14.3-.04.3H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h7.5c.28 0 .5.22.5.5V5a5 5 0 0 0 5 5h2.5c.28 0 .5.22.5.5v2.3a.4.4 0 0 1-.68.27l-.2-.2a3 3 0 0 0-4.24 0l-4 4a3 3 0 0 0 0 4.25c.3.3.6.46.94.58Z" />
            <path fill="currentColor" d="M21.66 8c.03 0 .05-.03.04-.06a3 3 0 0 0-.58-.82l-4.24-4.24a3 3 0 0 0-.82-.58.04.04 0 0 0-.06.04V5a3 3 0 0 0 3 3h2.66ZM18.3 14.3a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1-1.4 1.4L20 17.42V23a1 1 0 1 1-2 0v-5.59l-2.3 2.3a1 1 0 0 1-1.4-1.42l4-4Z" />
        </svg>
    );
}

const ctxMenuPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    children.push(
        <Menu.MenuItem
            id="vc-upload-torrent"
            label={
                <div className="optionLabel__77820">
                    <TorrentIcon className="optionIcon__77820" />
                    <div className="optionName__77820">Upload as Torrent</div>
                </div>
            }
            action={() => {
                if (currentUpload) {
                    currentUpload.cancel();
                    return;
                }
                const input = document.createElement("input");
                input.type = "file";
                input.onchange = e => {
                    const file = (e.target as HTMLInputElement)?.files?.[0];
                    if (file) handleTorrentUpload(file, channel.id).catch(logger.error);
                };
                input.click();
            }}
        />
    );
};

export default definePlugin({
    name: "UploadAsTorrent",
    description: "Adds an option to upload large files as torrents",
    authors: [Devs.noa],
    contextMenus: {
        "channel-attach": ctxMenuPatch
    }
});
