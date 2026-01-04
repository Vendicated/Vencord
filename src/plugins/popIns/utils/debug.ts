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

import { CLASS_PREFIX } from "../constants";
import { openWindows, windowOffset } from "../components/FloatingWindow";
import { StreamingStore } from "../stores";
import { Stream } from "../types";
import { createStreamWindow, currentChannelId } from "../components/FloatingWindow";

/**
 * Debug utilities exposed to window.PIN for console testing.
 */
export const DEBUG = {
    /**
     * List all video elements on the page.
     */
    listVideos() {
        const videos = document.querySelectorAll("video");
        console.log(`Found ${videos.length} video elements:`);
        videos.forEach((video, i) => {
            const srcObj = video.srcObject as MediaStream | null;
            const isOurs = video.closest(`.${CLASS_PREFIX}-window`) !== null;
            console.log(`[${i}] ${isOurs ? "(POPOUT)" : "(DISCORD)"} Video:`, {
                srcObject: srcObj ? "MediaStream" : "null",
                active: srcObj?.active,
                paused: video.paused,
                readyState: video.readyState,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                tracks: srcObj?.getVideoTracks().map(t => ({
                    id: t.id,
                    label: t.label,
                    readyState: t.readyState,
                    enabled: t.enabled
                }))
            });
        });
        return videos;
    },

    /**
     * Find all Discord videos associated with a specific user.
     */
    findUserVideos(userId: string) {
        const videos = document.querySelectorAll("video");
        const found: HTMLVideoElement[] = [];

        videos.forEach(video => {
            // Skip our own popout videos
            if (video.closest(`.${CLASS_PREFIX}-window`)) return;

            let parent = video.parentElement;
            let depth = 0;
            while (parent && depth < 20) {
                if (parent.outerHTML.includes(userId)) {
                    found.push(video as HTMLVideoElement);
                    break;
                }
                parent = parent.parentElement;
                depth++;
            }
        });

        console.log(`Found ${found.length} Discord videos for user ${userId}:`, found);
        return found;
    },

    /**
     * Get current plugin state.
     */
    getState() {
        return {
            openWindows: Array.from(openWindows.entries()).map(([key, el]) => ({
                key,
                hasCanvas: !!el.querySelector("canvas"),
                canvasSize: (() => {
                    const c = el.querySelector("canvas");
                    return c ? `${c.width}x${c.height}` : "none";
                })()
            })),
            currentChannelId,
            windowOffset
        };
    },

    /**
     * Get all active streams in the current channel.
     */
    getStreams() {
        if (StreamingStore && currentChannelId) {
            return StreamingStore.getAllActiveStreamsForChannel(currentChannelId);
        }
        return [];
    },

    /**
     * Force open a popout window for a specific user.
     */
    forceOpen(ownerId: string, channelId?: string) {
        const stream: Stream = {
            streamType: "guild",
            guildId: null,
            channelId: channelId || currentChannelId || "",
            ownerId
        };
        createStreamWindow(stream);
        return `Opened window for ${ownerId}`;
    }
};

// Expose debug utilities to window
(window as any).PIN = DEBUG;
