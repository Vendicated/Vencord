import { CLASS_PREFIX } from "../constants";

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
