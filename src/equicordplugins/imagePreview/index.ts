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
let lastMouseEvent: MouseEvent | null = null;

let observer: MutationObserver | null = null;

function deleteCurrentPreview() {
    if (!currentPreview) return;

    currentPreview.remove();
    lastMouseEvent = null;
    currentPreview = null;
    currentPreviewFile = null;
    currentPreviewFileSize = null;
    currentPreviewType = null;
    lastMouseEvent = null;
    isDragging = false;
    shouldKeepPreviewOpen = false;

    if (loadingSpinner) {
        loadingSpinner.remove();
        loadingSpinner = null;
    }

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

    const [maxWidth, maxHeight] = settings.store.defaultMaxSize === "0" ? [Infinity, Infinity] : settings.store.defaultMaxSize.split("x").map(Number);
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
    const fileSizeSpan = document.createElement("p");
    const showingSize = document.createElement("p");
    const mimeTypeSpan = document.createElement("span");

    fileSize.className = "file-size";

    const updatePositionAfterLoad = () => {
        if (lastMouseEvent && currentPreview) {
            updatePreviewPosition(lastMouseEvent, currentPreview);
        }
    };

    const resizeMedia = (mediaWidth: number, mediaHeight: number) => {
        const mediaElement = currentPreviewFile as HTMLImageElement | HTMLVideoElement | null;
        if (!mediaElement) return;

        if (mediaWidth > maxWidth || mediaHeight > maxHeight) {
            const widthRatio = maxWidth / mediaWidth;
            const heightRatio = maxHeight / mediaHeight;
            const scale = Math.min(widthRatio, heightRatio);

            mediaElement.style.width = `${mediaWidth * scale}px`;
            mediaElement.style.height = `${mediaHeight * scale}px`;
        }

        updatePositionAfterLoad();
    };

    fileName.textContent = url.split("/").pop()?.split("?")[0] || "";

    mimeTypeSpan.textContent = mimeType;

    fileInfo.appendChild(mimeTypeSpan);
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileSize);

    if (currentPreviewType === "video") {
        const video = document.createElement("video");
        video.src = url;
        video.className = "preview-media";
        video.autoplay = true;
        video.muted = true;
        video.loop = true;

        video.onplay = () => {
            video.removeAttribute("controls");
        };

        video.onloadeddata = () => {
            currentPreviewFileSize = [video.videoWidth, video.videoHeight];
            fileSizeSpan.textContent = `${currentPreviewFileSize[0]}x${currentPreviewFileSize[1]}`;
            fileSize.appendChild(fileSizeSpan);

            requestAnimationFrame(() => {
                if (!currentPreviewFileSize) return;
                const showingMediaSize = [video.clientWidth, video.clientHeight];
                if (showingMediaSize[0] !== currentPreviewFileSize[0] && showingMediaSize[1] !== currentPreviewFileSize[1]) {
                    showingSize.textContent = showingMediaSize ? `(${showingMediaSize[0]}x${showingMediaSize[1]})` : "";
                    fileSize.appendChild(showingSize);
                }

                preview.appendChild(fileInfo);
            });

            if (loadingSpinner) loadingSpinner.remove();
            video.style.display = "block";

            resizeMedia(video.videoWidth, video.videoHeight);
        };


        preview.appendChild(video);
        currentPreviewFile = video;
    } else {
        const img = new Image();
        img.src = url;
        img.className = "preview-media";
        img.onload = () => {
            currentPreviewFileSize = [img.naturalWidth, img.naturalHeight];
            fileSizeSpan.textContent = `${currentPreviewFileSize[0]}x${currentPreviewFileSize[1]}`;
            fileSize.appendChild(fileSizeSpan);

            requestAnimationFrame(() => {
                if (!currentPreviewFileSize) return;

                const showingMediaSize = [img.clientWidth, img.clientHeight];
                if (showingMediaSize[0] !== currentPreviewFileSize[0] && showingMediaSize[1] !== currentPreviewFileSize[1]) {
                    showingSize.textContent = showingMediaSize ? `(${showingMediaSize[0]}x${showingMediaSize[1]})` : "";
                    fileSize.appendChild(showingSize);
                }

                preview.appendChild(fileInfo);
            });

            if (loadingSpinner) loadingSpinner.remove();
            img.style.display = "block";

            resizeMedia(img.naturalWidth, img.naturalHeight);
        };

        preview.appendChild(img);
        currentPreviewFile = img;
    }

    if (settings.store.mouseOnlyMode) {
        currentPreview.addEventListener("mouseover", () => {
            if (currentPreview && !isCtrlHeld) {
                shouldKeepPreviewOpen = true;
                currentPreview.classList.add("allow-zoom-and-drag");
            }
        });

        currentPreview.addEventListener("mouseout", () => {
            if (currentPreview && !isCtrlHeld && shouldKeepPreviewOpen) {
                deleteCurrentPreview();
                shouldKeepPreviewOpen = false;
            }
        });
    }

    currentPreview.addEventListener("wheel", (event: WheelEvent) => {
        const [{ zoomFactor }, zoomSpeed] = [settings.store, 0.0005];

        if (isCtrlHeld || event.target === currentPreview || event.target === currentPreviewFile) {
            event.preventDefault();

            zoomLevel += event.deltaY * -zoomSpeed * zoomFactor;

            const previewMedia = currentPreviewFile as HTMLImageElement | HTMLVideoElement | null;
            if (previewMedia) {
                const rect = previewMedia.getBoundingClientRect();
                const offsetX = (event.clientX - rect.left) / rect.width;
                const offsetY = (event.clientY - rect.top) / rect.height;

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
        const basePadding = 15;
        const topPadding = 40;
        const maxWidth: number = window.innerWidth * 0.9;
        const maxHeight: number = window.innerHeight * 0.9;

        const previewWidth: number = currentPreview.offsetWidth;
        const previewHeight: number = currentPreview.offsetHeight;

        let left: number;
        let top: number = mouseEvent.pageY + basePadding;

        const spaceOnRight = window.innerWidth - mouseEvent.pageX - previewWidth - basePadding;
        const spaceOnLeft = mouseEvent.pageX - previewWidth - basePadding;

        if (spaceOnRight >= basePadding) {
            left = mouseEvent.pageX + basePadding;
        } else if (spaceOnLeft >= basePadding) {
            left = mouseEvent.pageX - previewWidth - basePadding;
        } else {
            left = Math.max(basePadding, Math.min(mouseEvent.pageX + basePadding, window.innerWidth - previewWidth - basePadding));
        }

        if (top + previewHeight > window.innerHeight) {
            top = mouseEvent.pageY - previewHeight - topPadding;

            if (top < topPadding) {
                top = window.innerHeight - previewHeight - topPadding * 2;
            }
        } else {
            top = Math.min(top, window.innerHeight - previewHeight - basePadding * 2);
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

    element.addEventListener("mouseover", event => {
        if (isCtrlHeld && currentPreview) return;

        if (currentPreview || loadingSpinner) {
            deleteCurrentPreview();
        }

        if (shouldKeepPreviewOpenTimeout) {
            clearTimeout(shouldKeepPreviewOpenTimeout);
            shouldKeepPreviewOpenTimeout = null;
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

        if (currentPreview && !isCtrlHeld && !settings.store.fixedImage) {
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
    if (event.key === "Control" && currentPreview) {
        isCtrlHeld = true;
        currentPreview.classList.add("allow-zoom-and-drag");
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
        element.removeAttribute("data-processed");
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
