/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { CLASS_PREFIX, logger } from "../constants";
import { StreamPreviewStore } from "../stores";
import { Stream } from "../types";
import { findStreamVideoElement } from "../utils/videoFinder";

/**
 * Configuration for video copy operations.
 */
interface VideoCopyConfig {
    /** User/owner ID for finding the video */
    ownerId: string;
    /** Log prefix for debugging */
    logPrefix: string;
    /** Document to search for video in */
    sourceDocument: Document;
    /** Fallback content when video not found (or async fallback function for streams) */
    onFallback: () => void | Promise<void>;
}

/**
 * Resize a container to match video resolution.
 * Max 800px, min 200px, maintains aspect ratio.
 */
function resizeContainerToVideo(
    container: HTMLDivElement,
    videoWidth: number,
    videoHeight: number,
    logPrefix: string = ""
): void {
    const maxDimension = 800;
    const minDimension = 200;
    let newWidth = videoWidth;
    let newHeight = videoHeight;

    if (newWidth > maxDimension || newHeight > maxDimension) {
        const scale = maxDimension / Math.max(newWidth, newHeight);
        newWidth = Math.round(newWidth * scale);
        newHeight = Math.round(newHeight * scale);
    }

    newWidth = Math.max(minDimension, newWidth);
    newHeight = Math.max(minDimension, newHeight);

    container.style.width = `${newWidth}px`;
    container.style.height = `${newHeight}px`;
    logger.info(`[resizeContainer]${logPrefix} Container resized to ${newWidth}x${newHeight} to match video ${videoWidth}x${videoHeight}`);
}

/**
 * Creates a resize handler that will only resize once.
 */
function createResizeHandler(container: HTMLDivElement, logPrefix: string = ""): (videoWidth: number, videoHeight: number) => void {
    let done = false;
    return (videoWidth: number, videoHeight: number) => {
        if (done) return;
        done = true;
        resizeContainerToVideo(container, videoWidth, videoHeight, logPrefix);
    };
}

/**
 * Generic video copy function - copies frames from a source video to a canvas.
 */
function startVideoCopy(
    container: HTMLDivElement,
    config: VideoCopyConfig
): void {
    const content = container.querySelector(`.${CLASS_PREFIX}-content`) as HTMLDivElement;
    if (!content) return;

    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let animationFrameId: number | null = null;
    let retryCount = 0;
    const maxRetries = 20;
    const resizeOnce = createResizeHandler(container, ` ${config.logPrefix}`);

    function findSourceVideo(): HTMLVideoElement | null {
        return findStreamVideoElement(config.ownerId, config.sourceDocument);
    }

    function setupCanvas() {
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.className = `${CLASS_PREFIX}-canvas`;
            content.innerHTML = "";
            content.appendChild(canvas);
            ctx = canvas.getContext("2d");
            logger.info(`${config.logPrefix} canvas created for ${config.ownerId}`);
        }
    }

    function copyFrame() {
        const sourceVideo = findSourceVideo();

        if (!sourceVideo || sourceVideo.videoWidth === 0) {
            retryCount++;
            if (retryCount > maxRetries * 60) { // ~20 seconds at 60fps
                stopCopying();
                config.onFallback();
                return;
            }
            animationFrameId = requestAnimationFrame(copyFrame);
            return;
        }

        retryCount = 0;
        resizeOnce(sourceVideo.videoWidth, sourceVideo.videoHeight);

        if (!canvas || !ctx) {
            setupCanvas();
        }

        if (canvas && ctx) {
            if (canvas.width !== sourceVideo.videoWidth || canvas.height !== sourceVideo.videoHeight) {
                canvas.width = sourceVideo.videoWidth;
                canvas.height = sourceVideo.videoHeight;
                logger.info(`${config.logPrefix} canvas resized to ${canvas.width}x${canvas.height}`);
            }

            try {
                ctx.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
            } catch (e) {
                logger.warn(`${config.logPrefix} drawImage failed:`, e);
            }
        }

        animationFrameId = requestAnimationFrame(copyFrame);
    }

    function stopCopying() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    logger.info(`Starting ${config.logPrefix.toLowerCase()} copy for ${config.ownerId}`);
    animationFrameId = requestAnimationFrame(copyFrame);

    (container as any)._stopCopying = stopCopying;
}

/**
 * Start canvas-based frame copying from Discord's video to our canvas.
 */
export function startCanvasCopy(
    container: HTMLDivElement,
    stream: Stream,
    username: string,
    sourceDocument: Document = document
): void {
    const content = container.querySelector(`.${CLASS_PREFIX}-content`) as HTMLDivElement;

    startVideoCopy(container, {
        ownerId: stream.ownerId,
        logPrefix: "Stream",
        sourceDocument,
        onFallback: () => loadStreamPreviewFallback(content, stream, username)
    });
}

/**
 * Start canvas-based frame copying for webcam videos.
 */
export function startWebcamCanvasCopy(
    container: HTMLDivElement,
    userId: string,
    _username: string,
    sourceDocument: Document = document
): void {
    const content = container.querySelector(`.${CLASS_PREFIX}-content`) as HTMLDivElement;

    startVideoCopy(container, {
        ownerId: userId,
        logPrefix: "Webcam",
        sourceDocument,
        onFallback: () => {
            content.innerHTML = `
                <div class="${CLASS_PREFIX}-no-preview">
                    <div class="${CLASS_PREFIX}-no-preview-icon">📷</div>
                    <div>Webcam video not found.</div>
                </div>
            `;
        }
    });
}

/**
 * Load stream preview image as fallback when video is not available.
 */
export async function loadStreamPreviewFallback(
    content: Element,
    stream: Stream,
    username: string
): Promise<void> {
    try {
        if (StreamPreviewStore) {
            const url = await StreamPreviewStore.getPreviewURL(
                stream.guildId,
                stream.channelId,
                stream.ownerId
            );

            if (url) {
                content.innerHTML = `<img class="${CLASS_PREFIX}-preview" src="${url}" alt="${username}'s stream">`;
            } else {
                content.innerHTML = `
                    <div class="${CLASS_PREFIX}-no-preview">
                        <div class="${CLASS_PREFIX}-no-preview-icon">📺</div>
                        <div>Stream video not found.</div>
                        <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
                            If you have the native Pop Out open,<br>please close it to view the stream here.
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        logger.error("Failed to load fallback preview:", e);
        content.innerHTML = `
            <div class="${CLASS_PREFIX}-no-preview">
                <div class="${CLASS_PREFIX}-no-preview-icon">⚠️</div>
                <div>Could not load stream</div>
            </div>
        `;
    }
}
