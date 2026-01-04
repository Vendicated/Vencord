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

// Cache to track which video element belongs to which user
const videoUserMap = new Map<HTMLVideoElement, string>();

/**
 * Find Discord's video element for a specific user's stream or webcam.
 * Searches the DOM for video elements and matches them to user IDs.
 */
export function findStreamVideoElement(ownerId: string, sourceDocument: Document = document): HTMLVideoElement | null {
    const videos = sourceDocument.querySelectorAll("video");
    const candidates: Array<{ video: HTMLVideoElement; matchDepth: number; }> = [];

    for (let i = 0; i < videos.length; i++) {
        const videoEl = videos[i] as HTMLVideoElement;

        // Skip our own popout videos
        if (videoEl.closest(`.${CLASS_PREFIX}-window`)) continue;

        // Skip videos without content
        if (!videoEl.videoWidth) continue;

        // Check if we've already mapped this video to a different user
        const mappedUser = videoUserMap.get(videoEl);
        if (mappedUser && mappedUser !== ownerId) continue;

        // Walk up DOM to find user ID
        let parent: HTMLElement | null = videoEl.parentElement;
        let depth = 0;
        let foundAtDepth = -1;

        while (parent && depth < 25) {
            const html = parent.innerHTML;

            if (html.includes(ownerId)) {
                if (foundAtDepth === -1) {
                    foundAtDepth = depth;
                    const outerHtml = parent.outerHTML;
                    const idIndex = outerHtml.indexOf(ownerId);
                    if (idIndex !== -1 && idIndex < 500) {
                        foundAtDepth = 0;
                    }
                }
            }
            parent = parent.parentElement;
            depth++;
        }

        if (foundAtDepth >= 0) {
            candidates.push({ video: videoEl, matchDepth: foundAtDepth });
        }
    }

    if (candidates.length === 0) {
        logger.warn(`No video candidates found for user ${ownerId} in ${sourceDocument === document ? "Main Window" : "Popout Window"}`);

        // Try to auto-click participants button to show participants
        tryAutoShowParticipants(sourceDocument);
        return null;
    }

    // Sort by match depth (lower is better/more specific)
    candidates.sort((a, b) => a.matchDepth - b.matchDepth);

    // Find the best candidate that isn't already mapped to another user
    for (const candidate of candidates) {
        const existingMapping = videoUserMap.get(candidate.video);
        if (!existingMapping || existingMapping === ownerId) {
            // Map this video to this user
            videoUserMap.set(candidate.video, ownerId);
            return candidate.video;
        }
    }

    logger.warn(`All candidates for ${ownerId} were already mapped to other users`);
    return null;
}

/**
 * Try to auto-click the participants button if it's hidden.
 */
function tryAutoShowParticipants(sourceDocument: Document): void {
    const participantsBtn = sourceDocument.querySelector('[class*="-participantsButton"]') as HTMLElement;
    if (participantsBtn) {
        const svg = participantsBtn.querySelector("svg");
        const svgClasses = svg?.className?.baseVal || svg?.getAttribute("class") || "";
        const hasUpCaret = svgClasses.includes("upCaret");

        if (hasUpCaret) {
            logger.info("[AutoFix] Participants are hidden - clicking button to show them");
            participantsBtn.click();
        }
    }
}

/**
 * Clear video mappings for a specific user (when closing their window).
 */
export function clearVideoMapping(ownerId: string): void {
    for (const [video, userId] of videoUserMap) {
        if (userId === ownerId) {
            videoUserMap.delete(video);
        }
    }
}

/**
 * Clear all video mappings (when closing all windows).
 */
export function clearAllVideoMappings(): void {
    videoUserMap.clear();
}
