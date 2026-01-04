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

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ScreenshareIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Menu, SelectedChannelStore, UserStore } from "@webpack/common";

// Types
interface Stream {
    streamType: string;
    guildId: string | null;
    channelId: string;
    ownerId: string;
}

interface VoiceStateChangeEvent {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
}

interface ApplicationStreamingStore {
    getAllActiveStreamsForChannel: (channelId: string) => Stream[];
    getAnyStreamForUser: (userId: string) => Stream | null;
}

interface ApplicationStreamPreviewStore {
    getPreviewURL: (guildId: string | null, channelId: string, ownerId: string) => Promise<string | null>;
}

// Lazy store access
const ApplicationStreamingStore: ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
const ApplicationStreamPreviewStore: ApplicationStreamPreviewStore = findStoreLazy("ApplicationStreamPreviewStore");

// Module state
const openWindows = new Map<string, HTMLDivElement>();
let currentChannelId: string | null = null;
let windowOffset = 0;

const logger = new Logger("MultiStreamPopout");

// Debug utilities - exposed to window.MSP for console testing
const DEBUG = {
    listVideos() {
        const videos = document.querySelectorAll("video");
        console.log(`Found ${videos.length} video elements:`);
        videos.forEach((video, i) => {
            const srcObj = video.srcObject as MediaStream | null;
            const isOurs = video.closest(".vc-msp-window") !== null;
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

    findUserVideos(userId: string) {
        const videos = document.querySelectorAll("video");
        const found: HTMLVideoElement[] = [];

        videos.forEach(video => {
            // Skip our own popout videos
            if (video.closest(".vc-msp-window")) return;

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

    getStreams() {
        if (ApplicationStreamingStore && currentChannelId) {
            return ApplicationStreamingStore.getAllActiveStreamsForChannel(currentChannelId);
        }
        return [];
    },

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

(window as any).MSP = DEBUG;

// Parse streamKey format
function parseStreamKey(streamKey: string): Stream | null {
    if (!streamKey) return null;

    const parts = streamKey.split(":");

    if (parts[0] === "guild" && parts.length === 4) {
        return {
            streamType: parts[0],
            guildId: parts[1],
            channelId: parts[2],
            ownerId: parts[3]
        };
    } else if (parts[0] === "call" && parts.length === 3) {
        return {
            streamType: parts[0],
            guildId: null,
            channelId: parts[1],
            ownerId: parts[2]
        };
    }

    logger.warn("Unknown streamKey format:", streamKey);
    return null;
}

function getWindowKey(stream: Stream): string {
    return `msp_${stream.channelId}_${stream.ownerId}`;
}

// Cache to track which video element belongs to which user
const videoUserMap = new Map<HTMLVideoElement, string>();

// Find Discord's video element for a specific user's stream
function findStreamVideoElement(ownerId: string): HTMLVideoElement | null {
    const videos = document.querySelectorAll("video");
    const candidates: Array<{ video: HTMLVideoElement; matchDepth: number; }> = [];

    for (const video of videos) {
        const videoEl = video as HTMLVideoElement;

        // Skip our own popout videos
        if (videoEl.closest(".vc-msp-window")) continue;

        // Skip videos without content
        if (!videoEl.videoWidth) continue;

        // Check if we've already mapped this video to a different user
        const mappedUser = videoUserMap.get(videoEl);
        if (mappedUser && mappedUser !== ownerId) continue;

        // Walk up DOM to find user ID
        let parent: HTMLElement | null = videoEl.parentElement;
        let depth = 0;
        let foundAtDepth = -1;

        while (parent && depth < 15) {
            // Look for more specific patterns - data attributes, avatar images, etc.
            const html = parent.innerHTML;

            // Check for user ID in the HTML
            if (html.includes(ownerId)) {
                // Found it! Record the depth for priority matching
                if (foundAtDepth === -1) {
                    foundAtDepth = depth;
                    // Also check if this is a direct match (userId near the video)
                    const outerHtml = parent.outerHTML;
                    const idIndex = outerHtml.indexOf(ownerId);
                    if (idIndex !== -1 && idIndex < 500) {
                        // User ID is close to the start - high confidence match
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
        logger.warn(`No video candidates found for user ${ownerId}`);
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
            logger.info(`Matched video to user ${ownerId} at depth ${candidate.matchDepth}`);
            return candidate.video;
        }
    }

    logger.warn(`All candidates for ${ownerId} were already mapped to other users`);
    return null;
}

// Clear video mappings when closing windows
function clearVideoMapping(ownerId: string) {
    for (const [video, userId] of videoUserMap) {
        if (userId === ownerId) {
            videoUserMap.delete(video);
        }
    }
}

// Create a floating window for a stream
function createStreamWindow(stream: Stream) {
    const key = getWindowKey(stream);

    if (openWindows.has(key)) {
        logger.info(`Window already exists for ${stream.ownerId}`);
        return;
    }

    logger.info(`Creating floating window for stream: ${stream.ownerId}`);

    const container = document.createElement("div");
    container.id = key;
    container.className = "vc-msp-window";
    container.style.top = `${100 + windowOffset * 30}px`;
    container.style.left = `${100 + windowOffset * 30}px`;
    windowOffset = (windowOffset + 1) % 10;

    const user = UserStore.getUser(stream.ownerId);
    const username = user?.globalName || user?.username || "Unknown User";

    // Minimal layout - just the content area with resize handles
    container.innerHTML = `
        <div class="vc-msp-content">
            <div class="vc-msp-loading">Finding stream...</div>
        </div>
        <div class="vc-msp-resize-handle vc-msp-resize-n"></div>
        <div class="vc-msp-resize-handle vc-msp-resize-e"></div>
        <div class="vc-msp-resize-handle vc-msp-resize-s"></div>
        <div class="vc-msp-resize-handle vc-msp-resize-w"></div>
        <div class="vc-msp-resize-handle vc-msp-resize-ne"></div>
        <div class="vc-msp-resize-handle vc-msp-resize-se"></div>
        <div class="vc-msp-resize-handle vc-msp-resize-sw"></div>
        <div class="vc-msp-resize-handle vc-msp-resize-nw"></div>
        <button class="vc-msp-close-btn">✕</button>
    `;

    document.body.appendChild(container);
    openWindows.set(key, container);

    // Make entire window draggable
    makeDraggable(container, stream);

    // Make window resizable from all edges
    makeResizable(container);

    // Close button
    const closeBtn = container.querySelector(".vc-msp-close-btn") as HTMLButtonElement;
    closeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        closeStreamWindow(stream);
    });

    // Start canvas-based frame copying
    startCanvasCopy(container, stream, username);
}

// Canvas-based frame copying - copies frames from Discord's video to our canvas
function startCanvasCopy(container: HTMLDivElement, stream: Stream, username: string) {
    const content = container.querySelector(".vc-msp-content") as HTMLDivElement;
    if (!content) return;

    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let animationFrameId: number | null = null;
    let retryCount = 0;
    const maxRetries = 20;

    function findSourceVideo(): HTMLVideoElement | null {
        return findStreamVideoElement(stream.ownerId);
    }

    function setupCanvas() {
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.className = "vc-msp-canvas";
            content.innerHTML = "";
            content.appendChild(canvas);
            ctx = canvas.getContext("2d");
            logger.info(`Canvas created for ${stream.ownerId}`);
        }
    }

    function copyFrame() {
        const sourceVideo = findSourceVideo();

        if (!sourceVideo || sourceVideo.videoWidth === 0) {
            retryCount++;
            if (retryCount > maxRetries * 60) { // ~20 seconds at 60fps
                // Give up and show preview
                stopCopying();
                loadStreamPreviewFallback(content, stream, username);
                return;
            }
            animationFrameId = requestAnimationFrame(copyFrame);
            return;
        }

        // Reset retry count on success
        retryCount = 0;

        // Setup canvas if not done
        if (!canvas || !ctx) {
            setupCanvas();
        }

        if (canvas && ctx) {
            // Resize canvas if needed
            if (canvas.width !== sourceVideo.videoWidth || canvas.height !== sourceVideo.videoHeight) {
                canvas.width = sourceVideo.videoWidth;
                canvas.height = sourceVideo.videoHeight;
                logger.info(`Canvas resized to ${canvas.width}x${canvas.height}`);
            }

            // Copy frame
            try {
                ctx.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
            } catch (e) {
                logger.warn("drawImage failed:", e);
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

    // Start the copy loop
    logger.info(`Starting canvas copy for ${stream.ownerId}`);
    animationFrameId = requestAnimationFrame(copyFrame);

    // Store cleanup function
    (container as any)._stopCopying = stopCopying;
}

// Fallback to preview image
async function loadStreamPreviewFallback(content: Element, stream: Stream, username: string) {
    try {
        if (ApplicationStreamPreviewStore) {
            const url = await ApplicationStreamPreviewStore.getPreviewURL(
                stream.guildId,
                stream.channelId,
                stream.ownerId
            );

            if (url) {
                content.innerHTML = `<img class="vc-msp-preview" src="${url}" alt="${username}'s stream">`;
            } else {
                content.innerHTML = `
                    <div class="vc-msp-no-preview">
                        <div class="vc-msp-no-preview-icon">📺</div>
                        <div>Stream not found</div>
                    </div>
                `;
            }
        }
    } catch (e) {
        logger.error("Failed to load fallback preview:", e);
        content.innerHTML = `
            <div class="vc-msp-no-preview">
                <div class="vc-msp-no-preview-icon">⚠️</div>
                <div>Could not load stream</div>
            </div>
        `;
    }
}

// Make entire window draggable
function makeDraggable(element: HTMLDivElement, stream: Stream) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    // Drag from anywhere on the window
    element.addEventListener("mousedown", (e) => {
        // Don't drag if clicking on close button or resize handles
        const target = e.target as HTMLElement;
        if (target.classList.contains("vc-msp-close-btn") ||
            target.classList.contains("vc-msp-resize-handle")) {
            return;
        }

        isDragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;
        element.style.zIndex = "10001";
        element.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        element.style.left = `${Math.max(0, e.clientX - offsetX)}px`;
        element.style.top = `${Math.max(0, e.clientY - offsetY)}px`;
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = "10000";
            element.style.cursor = "grab";
        }
    });
}

// Make window resizable from all edges
function makeResizable(element: HTMLDivElement) {
    const handles = element.querySelectorAll(".vc-msp-resize-handle");

    handles.forEach(handle => {
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;
        let startLeft = 0;
        let startTop = 0;

        const direction = Array.from(handle.classList)
            .find(c => c.startsWith("vc-msp-resize-") && c !== "vc-msp-resize-handle")
            ?.replace("vc-msp-resize-", "") || "";

        handle.addEventListener("mousedown", ((e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = element.offsetWidth;
            startHeight = element.offsetHeight;
            startLeft = element.offsetLeft;
            startTop = element.offsetTop;

            const onMouseMove = (e: MouseEvent) => {
                if (!isResizing) return;

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                // Handle each direction
                if (direction.includes("e")) {
                    element.style.width = `${Math.max(200, startWidth + dx)}px`;
                }
                if (direction.includes("w")) {
                    const newWidth = Math.max(200, startWidth - dx);
                    element.style.width = `${newWidth}px`;
                    element.style.left = `${startLeft + (startWidth - newWidth)}px`;
                }
                if (direction.includes("s")) {
                    element.style.height = `${Math.max(150, startHeight + dy)}px`;
                }
                if (direction.includes("n")) {
                    const newHeight = Math.max(150, startHeight - dy);
                    element.style.height = `${newHeight}px`;
                    element.style.top = `${startTop + (startHeight - newHeight)}px`;
                }
            };

            const onMouseUp = () => {
                isResizing = false;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        }) as EventListener);
    });
}

function closeStreamWindow(stream: Stream) {
    const key = getWindowKey(stream);
    const container = openWindows.get(key);

    if (!container) return;

    logger.info(`Closing window for stream: ${stream.ownerId}`);

    // Stop canvas copying
    if ((container as any)._stopCopying) {
        (container as any)._stopCopying();
    }

    // Clear video mapping for this user
    clearVideoMapping(stream.ownerId);

    container.remove();
    openWindows.delete(key);
}

function closeAllWindows() {
    logger.info(`Closing all ${openWindows.size} windows`);

    for (const [, container] of openWindows) {
        if ((container as any)._stopCopying) {
            (container as any)._stopCopying();
        }
        container.remove();
    }

    openWindows.clear();
    videoUserMap.clear();
    windowOffset = 0;
}

function openWindowsForChannel(channelId: string) {
    if (!ApplicationStreamingStore) {
        logger.warn("ApplicationStreamingStore not available");
        return;
    }

    const streams = ApplicationStreamingStore.getAllActiveStreamsForChannel(channelId);
    logger.info(`Found ${streams.length} active streams in channel ${channelId}`);

    for (const stream of streams) {
        createStreamWindow(stream);
    }
}

function handleStreamDelete(stream: Stream) {
    closeStreamWindow(stream);
}

// Context menu props types
interface StreamContextProps {
    stream: Stream;
}

interface UserContextProps {
    user: { id: string; };
}

// Context menu patch - adds "Pop Out Stream" option
const streamContextPatch: NavContextMenuPatchCallback = (children, { stream }: StreamContextProps) => {
    const windowKey = getWindowKey(stream);
    const isOpen = openWindows.has(windowKey);

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuItem
            id="pop-out-stream"
            label={isOpen ? "Close Stream Popout" : "Pop Out Stream"}
            icon={ScreenshareIcon}
            action={() => {
                if (isOpen) {
                    closeStreamWindow(stream);
                } else {
                    createStreamWindow(stream);
                }
            }}
        />
    );
};

// Also add to user context menu (when right-clicking on someone who's streaming)
const userContextPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user || !ApplicationStreamingStore) return;

    const stream = ApplicationStreamingStore.getAnyStreamForUser(user.id);
    if (!stream) return;

    const windowKey = getWindowKey(stream as Stream);
    const isOpen = openWindows.has(windowKey);

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuItem
            id="pop-out-stream"
            label={isOpen ? "Close Stream Popout" : "Pop Out Stream"}
            icon={ScreenshareIcon}
            action={() => {
                if (isOpen) {
                    closeStreamWindow(stream as Stream);
                } else {
                    createStreamWindow(stream as Stream);
                }
            }}
        />
    );
};

export default definePlugin({
    name: "MultiStreamPopout",
    description: "Right-click on a stream to pop it out to a floating window",
    authors: [Devs.Ven],

    contextMenus: {
        "stream-context": streamContextPatch
    },

    flux: {
        // Track current channel for cleanup
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceStateChangeEvent[]; }) {
            const myId = UserStore.getCurrentUser()?.id;
            if (!myId) return;

            for (const state of voiceStates) {
                if (state.userId !== myId) continue;

                const { channelId, oldChannelId } = state;

                // User joined/moved to a channel
                if (channelId) {
                    currentChannelId = channelId;
                }

                // User left a channel - close all popouts
                if (!channelId && oldChannelId) {
                    logger.info(`Left channel ${oldChannelId}, closing popouts`);
                    currentChannelId = null;
                    closeAllWindows();
                }

                // User moved channels - close popouts from old channel
                if (channelId && oldChannelId && channelId !== oldChannelId) {
                    logger.info(`Moved channels, closing old popouts`);
                    closeAllWindows();
                }
            }
        },

        // Close popout when stream ends
        STREAM_DELETE(event: any) {
            logger.info("STREAM_DELETE event:", event.streamKey);
            const stream = parseStreamKey(event.streamKey);
            if (!stream) return;
            handleStreamDelete(stream);
        }
    },

    streamObserver: null as MutationObserver | null,

    start() {
        logger.info("MultiStreamPopout starting...");
        const voiceChannelId = SelectedChannelStore.getVoiceChannelId();
        if (voiceChannelId) {
            currentChannelId = voiceChannelId;
        }

        // Watch for stream option panels and inject our button
        this.streamObserver = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node instanceof HTMLElement) {
                        this.tryInjectButton(node);
                    }
                }
            }
        });

        this.streamObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    stop() {
        logger.info("MultiStreamPopout stopping...");
        closeAllWindows();
        currentChannelId = null;

        if (this.streamObserver) {
            this.streamObserver.disconnect();
            this.streamObserver = null;
        }
    },

    // Try to inject popout button into stream option panels
    tryInjectButton(element: HTMLElement) {
        // Look for buttons/menu items in popovers that contain stream-related text
        const menuItems = element.querySelectorAll('[class*="menuItem"], [class*="button"], [role="menuitem"]');

        for (const item of menuItems) {
            const text = item.textContent?.toLowerCase() || "";

            // Check if this looks like a stream options panel
            // (contains volume, mute, or stream-related text)
            if (text.includes("volume") || text.includes("mute") || text.includes("stream")) {
                const parent = item.closest('[class*="menu"], [class*="popout"], [role="menu"]');
                if (parent && !parent.querySelector(".vc-msp-inject-btn")) {
                    this.injectPopoutButton(parent as HTMLElement);
                    break;
                }
            }
        }
    },

    injectPopoutButton(panel: HTMLElement) {
        // Find a stream to open (the one currently being viewed/selected)
        const streams = ApplicationStreamingStore?.getAllActiveStreamsForChannel(currentChannelId || "");
        if (!streams || streams.length === 0) return;

        // Try to find which stream this panel is for
        // For now, we'll create buttons for all streams if we can't identify the specific one
        const stream = streams[0]; // Default to first stream

        const btn = document.createElement("div");
        btn.className = "vc-msp-inject-btn";
        btn.innerHTML = `
            <div class="vc-msp-panel-btn" role="menuitem">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 8h2v8H9zm4 0h2v8h-2z"/>
                </svg>
                <span>Pop Out Stream</span>
            </div>
        `;

        btn.addEventListener("click", () => {
            const key = getWindowKey(stream);
            if (openWindows.has(key)) {
                closeStreamWindow(stream);
            } else {
                createStreamWindow(stream);
            }
        });

        // Insert at the end of the panel
        panel.appendChild(btn);
        logger.info("Injected popout button into stream panel");
    }
});

