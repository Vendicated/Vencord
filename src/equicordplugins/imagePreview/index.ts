/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import { getMimeType, isLinkAnImage, settings, stripDiscordParams } from "./settings";

let currentPreview: HTMLDivElement | null = null;
let currentPreviewFile: HTMLImageElement | HTMLVideoElement | null = null;
let currentPreviewFileSize: [number, number] | null = null;
let currentPreviewType: "image" | "video" | null = null;
let loadingSpinner: HTMLDivElement | null = null;
let isCtrlHeld: boolean = false;
let zoomLevel: number = 1;
let dragOffsetX: number = 0;
let dragOffsetY: number = 0;
let isDragging: boolean = false;
let shouldKeepPreviewOpenTimeout: NodeJS.Timeout | null = null;
let shouldKeepPreviewOpen: boolean = false;
let hoverDelayTimeout: NodeJS.Timeout | null = null;

let observer: MutationObserver | null = null;

function deleteCurrentPreview() {
    if (!currentPreview || !currentPreviewFile || !currentPreviewFileSize || !currentPreviewType) return;

    currentPreview.remove();
    currentPreview = null;
    currentPreviewFile = null;
    currentPreviewFileSize = null;
    currentPreviewType = null;
    zoomLevel = 1;
}

function scanObjects(element: Element) {
    if (settings.store.messageImages) {
        element.querySelectorAll('[data-role="img"]:not([data-processed="true"])').forEach(img => {
            const messageParent = img.closest("[class^='messageListItem_']");
            if (messageParent) {
                addHoverListener(img);
            }
        });
    }

    if (settings.store.messageAvatars) {
        const selectors = [
            'img[src*="cdn.discordapp.com/avatars/"]:not([data-processed="true"])',
            'img[src*="cdn.discordapp.com/guilds/"]:not([data-processed="true"])',
            'img[src^="/assets/"][class*="avatar"]:not([data-processed="true"])',
        ];

        const jointSelector = selectors.join(", ");
        element.querySelectorAll(jointSelector).forEach(avatar => {
            const messageParent = avatar.closest("[class^='messageListItem_']");
            if (messageParent) {
                addHoverListener(avatar);
            }
        });
    }

    if (settings.store.messageLinks) {
        element.querySelectorAll("span:not([data-processed='true'])").forEach(span => {
            const url = span.textContent?.replace(/<[^>]*>?/gm, "").trim();
            if (url && (url.startsWith("http://") || url.startsWith("https://")) && isLinkAnImage(url)) {
                const messageParent = span.closest("[class^='messageListItem_']");
                if (messageParent) {
                    addHoverListener(span);
                }
            }
        });
    }

    if (settings.store.messageStickers) {
        element.querySelectorAll('img[data-type="sticker"]:not([data-processed="true"])').forEach(sticker => {
            const messageParent = sticker.closest("[class^='messageListItem_']");
            if (messageParent) {
                addHoverListener(sticker);
            }
        });
    }
}

function createObserver() {
    return new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(addedNode => {
                    if (addedNode instanceof HTMLElement) {
                        const element = addedNode as HTMLElement;
                        scanObjects(element);
                    }
                });
            }
        });
    });
}

function loadImagePreview(url: string) {
    const urlParams = new URLSearchParams(url.split("?")[1]);
    const formatParam = urlParams.get("format");
    const extension = formatParam || url.split(".").pop()?.split("?")[0] || "";
    const [allowed, mimeType] = getMimeType(extension);

    if (!allowed) return;

    currentPreviewType = mimeType.includes("video") ? "video" : "image";

    const preview = document.createElement("div");
    preview.className = "image-preview";

    loadingSpinner = document.createElement("div");
    loadingSpinner.className = "loading-spinner";

    preview.appendChild(loadingSpinner);
    document.body.appendChild(preview);
    currentPreview = preview;

    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";

    const fileName = document.createElement("span");
    const fileSize = document.createElement("span");
    const mimeTypeSpan = document.createElement("span");

    fileName.textContent = url.split("/").pop()?.split("?")[0] || "";
    mimeTypeSpan.textContent = mimeType;

    if (currentPreviewType === "video") {
        const video = document.createElement("video");
        video.src = url;
        video.className = "preview-media";
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.style.pointerEvents = "none";

        video.onplay = () => {
            video.removeAttribute("controls");
        };

        video.onloadeddata = () => {
            currentPreviewFileSize = [video.videoWidth, video.videoHeight];
            fileSize.textContent = `${currentPreviewFileSize[0]}x${currentPreviewFileSize[1]}`;
            if (loadingSpinner) loadingSpinner.remove();
            video.style.display = "block";
        };

        preview.appendChild(video);
        currentPreviewFile = video;
    } else {
        const img = new Image();
        img.src = url;
        img.className = "preview-media";
        img.onload = () => {
            currentPreviewFileSize = [img.naturalWidth, img.naturalHeight];
            fileSize.textContent = `${currentPreviewFileSize[0]}x${currentPreviewFileSize[1]}`;
            if (loadingSpinner) loadingSpinner.remove();
            img.style.display = "block";
        };
        preview.appendChild(img);
        currentPreviewFile = img;
    }

    fileInfo.appendChild(mimeTypeSpan);
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileSize);
    preview.appendChild(fileInfo);

    currentPreviewFile.addEventListener("mouseover", () => {
        if (currentPreview && !isCtrlHeld) {
            shouldKeepPreviewOpen = true;
            currentPreview.classList.add("allow-zoom-and-drag");
        }
    });

    currentPreviewFile.addEventListener("mouseout", () => {
        if (currentPreview && !isCtrlHeld && shouldKeepPreviewOpen) {
            deleteCurrentPreview();
            shouldKeepPreviewOpen = false;
        }
    });

    currentPreview.addEventListener("wheel", (event: WheelEvent) => {
        const zoomSpeed = 0.0005;

        if (isCtrlHeld || event.target === currentPreview || event.target === currentPreviewFile) {
            event.preventDefault();
            zoomLevel += event.deltaY * -zoomSpeed;

            zoomLevel = Math.min(Math.max(zoomLevel, 0.5), 10);

            const previewMedia = currentPreviewFile as HTMLImageElement | HTMLVideoElement | null;
            if (previewMedia) {
                const rect = previewMedia.getBoundingClientRect();
                let offsetX = (event.clientX - rect.left) / rect.width;
                let offsetY = (event.clientY - rect.top) / rect.height;

                offsetX = Math.min(Math.max(offsetX, 0.1), 0.9);
                offsetY = Math.min(Math.max(offsetY, 0.1), 0.9);

                previewMedia.style.transformOrigin = `${offsetX * 100}% ${offsetY * 100}%`;
                previewMedia.style.transform = `scale(${zoomLevel})`;
            }
        }
    });

    currentPreview.addEventListener("mousedown", (event: MouseEvent) => {
        if ((isCtrlHeld || shouldKeepPreviewOpen) && currentPreview) {
            isDragging = true;

            const rect = currentPreview.getBoundingClientRect();
            dragOffsetX = event.clientX - rect.left;
            dragOffsetY = event.clientY - rect.top;

            event.preventDefault();
        }
    });
}

function updatePreviewPosition(mouseEvent: MouseEvent, element: HTMLElement) {
    if (currentPreview && !isCtrlHeld) {
        const padding = 15;
        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight * 0.9;

        const previewWidth = currentPreview.offsetWidth;
        const previewHeight = currentPreview.offsetHeight;

        let left = mouseEvent.pageX + padding;
        let top = mouseEvent.pageY + padding;

        if (left + previewWidth > window.innerWidth) {
            left = mouseEvent.pageX - previewWidth - padding;
            if (left < padding) {
                left = window.innerWidth - previewWidth - padding;
            }
        }

        if (top + previewHeight > window.innerHeight) {
            top = mouseEvent.pageY - previewHeight - padding;
            if (top < padding) {
                top = window.innerHeight - previewHeight - padding;
            }
        }

        currentPreview.style.left = `${left}px`;
        currentPreview.style.top = `${top}px`;

        const mediaElement = element as HTMLImageElement | HTMLVideoElement | null;
        if (mediaElement) {
            mediaElement.style.maxWidth = `${maxWidth}px`;
            mediaElement.style.maxHeight = `${maxHeight}px`;
        }
    }
}

function addHoverListener(element: Element) {
    element.setAttribute("data-processed", "true");

    let lastMouseEvent: MouseEvent | null = null;

    element.addEventListener("mouseover", event => {
        if (currentPreview) {
            if (isCtrlHeld) return;

            deleteCurrentPreview();

            if (shouldKeepPreviewOpenTimeout) {
                clearTimeout(shouldKeepPreviewOpenTimeout);
                shouldKeepPreviewOpenTimeout = null;
            }
        }

        if (hoverDelayTimeout) {
            clearTimeout(hoverDelayTimeout);
            hoverDelayTimeout = null;
        }

        const mouseEvent = event as MouseEvent;
        lastMouseEvent = mouseEvent;
        const imageURL: string | null =
            element.getAttribute("data-safe-src") ||
            element.getAttribute("src") ||
            element.getAttribute("href") ||
            element.textContent;
        const strippedURL: string | null = imageURL
            ? stripDiscordParams(imageURL)
            : null;

        if (!strippedURL) return;

        hoverDelayTimeout = setTimeout(() => {
            loadImagePreview(strippedURL);
            if (lastMouseEvent) {
                updatePreviewPosition(lastMouseEvent, element as HTMLElement);
            }
        }, settings.store.hoverDelay * 1000);
    });

    element.addEventListener("mousemove", event => {
        if (!hoverDelayTimeout) return;

        lastMouseEvent = event as MouseEvent;

        if (currentPreview && !isCtrlHeld) {
            updatePreviewPosition(lastMouseEvent, element as HTMLElement);
        }
    });

    element.addEventListener("mouseout", () => {
        if (hoverDelayTimeout) {
            clearTimeout(hoverDelayTimeout);
            hoverDelayTimeout = null;
        }

        function remove() {
            if (currentPreview && !isCtrlHeld && !shouldKeepPreviewOpen) {
                deleteCurrentPreview();
            }
        }

        if (settings.store.mouseOnlyMode) {
            shouldKeepPreviewOpenTimeout = setTimeout(remove, 500);
        } else {
            remove();
        }
    });
}

function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Control") {
        isCtrlHeld = true;
        if (currentPreview) {
            currentPreview.classList.add("allow-zoom-and-drag");
        }
    }
}

function handleKeyup(event: KeyboardEvent) {
    if (event.key === "Control") {
        isCtrlHeld = false;
        if (currentPreview) {
            deleteCurrentPreview();
        }
    }
}

function handleMousemove(event: MouseEvent) {
    if (isDragging && (isCtrlHeld || shouldKeepPreviewOpen) && currentPreview) {
        const left = event.clientX - dragOffsetX;
        const top = event.clientY - dragOffsetY;

        currentPreview.style.left = `${left}px`;
        currentPreview.style.top = `${top}px`;
    }
}

function handleMouseup() {
    if (currentPreview && isDragging) {
        isDragging = false;
    }
}

function removeHoverListeners() {
    const processedElements = document.querySelectorAll('[data-processed="true"]');

    processedElements.forEach(element => {
        const clone = element.cloneNode(true);
        element.replaceWith(clone);
    });
}

export default definePlugin({
    name: "ImagePreview",
    description: "Hover on message images, avatars, links, and message stickers to show a full preview.",
    authors: [EquicordDevs.creations],
    settings: settings,

    start() {
        const targetNode = document.querySelector('[class*="app-"]');
        if (!targetNode) return;

        scanObjects(targetNode);
        document.addEventListener("keydown", handleKeydown);
        document.addEventListener("keyup", handleKeyup);
        document.addEventListener("mousemove", handleMousemove);
        document.addEventListener("mouseup", handleMouseup);

        observer = createObserver();
        observer.observe(targetNode, { childList: true, subtree: true });
    },

    stop() {
        if (observer) observer.disconnect();

        deleteCurrentPreview();
        removeHoverListeners();

        document.removeEventListener("keydown", handleKeydown);
        document.removeEventListener("keyup", handleKeyup);
        document.removeEventListener("mousemove", handleMousemove);
        document.removeEventListener("mouseup", handleMouseup);
    }
});
