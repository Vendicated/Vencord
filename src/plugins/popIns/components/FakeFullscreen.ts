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
import { getTitleBarHeight, getSidebarWidth } from "../utils/discordUI";

/**
 * Toggle Fake Fullscreen Mode for a video in the document.
 * Enlarges the first video element to cover the available screen area.
 */
export function toggleFakeFullscreen(doc: Document = document): void {
    // Find all videos in the document
    const videos = Array.from(doc.querySelectorAll("video")) as HTMLVideoElement[];

    // Debug: Log all videos found
    logger.info(`[FakeFullscreen] Found ${videos.length} video(s):`);
    videos.forEach((video, i) => {
        logger.info(`  [${i}] size=${video.videoWidth}x${video.videoHeight}, paused=${video.paused}, readyState=${video.readyState}`);
    });

    if (videos.length === 0) {
        logger.warn("[FakeFullscreen] No videos found!");
        return;
    }

    // Always use video #0 - Discord's natural ordering
    const mainVideo = videos[0];
    logger.info(`[FakeFullscreen] Enlarging video #0: ${mainVideo.videoWidth}x${mainVideo.videoHeight}`);

    // Find the container to maximize
    let container = mainVideo.parentElement;
    let depth = 0;
    let targetContainer = container;

    while (container && depth < 10) {
        if (container.classList.contains(`${CLASS_PREFIX}-native-fs`)) {
            targetContainer = container;
            break;
        }
        if (container.className.includes("tile") || container.className.includes("wrapper")) {
            targetContainer = container;
        }
        container = container.parentElement;
        depth++;
    }

    if (!targetContainer) targetContainer = mainVideo.parentElement;

    if (targetContainer) {
        const btn = doc.querySelector('[class*="-participantsButton"]') as HTMLElement;

        if (targetContainer.classList.contains(`${CLASS_PREFIX}-native-fs`)) {
            // Restore
            targetContainer.classList.remove(`${CLASS_PREFIX}-native-fs`);
            targetContainer.style.position = "";
            targetContainer.style.top = "";
            targetContainer.style.left = "";
            targetContainer.style.width = "";
            targetContainer.style.height = "";
            targetContainer.style.zIndex = "";
            targetContainer.style.backgroundColor = "";

            if (btn) btn.style.display = "";

            // Remove ESC handler
            if ((targetContainer as any)._fsEscHandler) {
                doc.removeEventListener("keydown", (targetContainer as any)._fsEscHandler);
                delete (targetContainer as any)._fsEscHandler;
            }
        } else {
            // Maximize
            const titleBarHeight = getTitleBarHeight(doc);
            const sidebarWidth = getSidebarWidth(doc);

            targetContainer.classList.add(`${CLASS_PREFIX}-native-fs`);
            targetContainer.style.setProperty("position", "fixed", "important");
            targetContainer.style.setProperty("top", `${titleBarHeight}px`, "important");
            targetContainer.style.setProperty("left", `${sidebarWidth}px`, "important");
            targetContainer.style.setProperty("width", `calc(100% - ${sidebarWidth}px)`, "important");
            targetContainer.style.setProperty("height", `calc(100% - ${titleBarHeight}px)`, "important");
            targetContainer.style.setProperty("z-index", "2147483647", "important");
            targetContainer.style.setProperty("background-color", "#000", "important");

            if (btn) btn.style.display = "none";

            // ESC key handler to exit fake fullscreen
            const escHandler = (e: KeyboardEvent) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFakeFullscreen(doc);
                }
            };
            doc.addEventListener("keydown", escHandler);
            (targetContainer as any)._fsEscHandler = escHandler;
        }
    }
}
