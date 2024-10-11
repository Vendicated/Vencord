/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const eventListeners: { element: HTMLElement, handler: (e: any) => void; }[] = [];
let lastHoveredElement: HTMLElement | null = null;

const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
};

const formatDimension = (value) => value % 1 === 0 ? value : value.toFixed(2);

function getMimeType(extension: string | undefined): [boolean, string] {
    if (!extension) return [false, ""];

    const lowerExt = extension.trim().toLowerCase();
    return [!!mimeTypes[lowerExt], mimeTypes[lowerExt] || ""];
}

function addHoverEffect(element: HTMLElement, type: string) {
    let isManualResizing: boolean = false;
    let isOutlining: boolean = true;

    if (settings.store.hoverOutline) {
        if (type === "messageImages") {
            element.style.border = `${settings.store.hoverOutlineSize} dotted ${settings.store.hoverOutlineColor}`;
            isOutlining = false;
        } else {
            element.style.outline = `${settings.store.hoverOutlineSize} dotted ${settings.store.hoverOutlineColor}`;
        }
    }

    const url = element.getAttribute("data-safe-src") || element.getAttribute("src") || element.getAttribute("href") || element.textContent;

    if (!url) {
        isOutlining ? element.style.outline = "" : element.style.border = "";
        return;
    }

    const strippedUrl = stripDiscordParams(url);
    const fileName: string = strippedUrl.split("/").pop()?.split(/[?#&]/)[0] || "unknown";
    const [allowed, mimeType] = getMimeType(fileName.split(".").pop());

    if (!allowed) {
        isOutlining ? element.style.outline = "" : element.style.border = "";
        return;
    }

    const isImage = allowed && mimeType.startsWith("image");
    const isVideo = allowed && mimeType.startsWith("video");

    const previewDiv = document.createElement("div");
    previewDiv.classList.add("preview-div");

    let mediaElement;
    if (isImage) {
        mediaElement = document.createElement("img");
        mediaElement.src = strippedUrl;
        mediaElement.alt = fileName;
    } else if (isVideo) {
        mediaElement = document.createElement("video");
        mediaElement.src = strippedUrl;
        mediaElement.autoplay = true;
        mediaElement.muted = true;
        mediaElement.loop = true;
        mediaElement.controls = false;
    } else {
        return;
    }

    const previewHeader = document.createElement("div");
    previewHeader.classList.add("preview-header");

    const mimeSpan = document.createElement("span");
    mimeSpan.textContent = `MIME: ${mimeType}`;
    previewHeader.appendChild(mimeSpan);

    const fileNameSpan = document.createElement("span");
    fileNameSpan.classList.add("file-name");
    fileNameSpan.textContent = fileName;
    previewHeader.appendChild(fileNameSpan);

    const dimensionsDiv = document.createElement("div");
    dimensionsDiv.classList.add("dimensions-div");

    const dimensionsDisplaying = document.createElement("span");
    dimensionsDisplaying.classList.add("dimensions-displaying");
    const dimensionsOriginal = document.createElement("span");
    dimensionsOriginal.classList.add("dimensions-original");

    dimensionsDiv.appendChild(dimensionsDisplaying);
    dimensionsDiv.appendChild(dimensionsOriginal);
    previewHeader.appendChild(dimensionsDiv);

    previewDiv.appendChild(previewHeader);
    previewDiv.appendChild(mediaElement);

    document.body.appendChild(previewDiv);
    previewDiv.style.display = "none";

    const hoverDelay = settings.store.hoverDelay * 1000;
    let timeout;
    let isMediaLoaded = false;

    const startLoading = () => {
        if (isImage) {
            mediaElement.onload = () => {
                isMediaLoaded = true;
                setMediaDimensions();
            };
        } else if (isVideo) {
            mediaElement.onloadeddata = () => {
                isMediaLoaded = true;
                setMediaDimensions();
            };
        }
    };

    const setMediaDimensions = () => {
        if (isManualResizing) {
            return;
        }

        if (isImage) {
            const maxHeight = window.innerHeight * 0.9;
            if (mediaElement.naturalHeight > maxHeight) {
                const aspectRatio = mediaElement.naturalWidth / mediaElement.naturalHeight;
                mediaElement.height = maxHeight;
                mediaElement.width = maxHeight * aspectRatio;
            } else {
                mediaElement.width = mediaElement.naturalWidth;
                mediaElement.height = mediaElement.naturalHeight;
            }
            dimensionsDisplaying.textContent = `Displaying: ${formatDimension(mediaElement.width)}x${formatDimension(mediaElement.height)}`;
            dimensionsOriginal.textContent = `Original: ${mediaElement.naturalWidth}x${mediaElement.naturalHeight}`;
        } else if (isVideo) {
            const maxHeight = window.innerHeight * 0.9;
            if (mediaElement.videoHeight > maxHeight) {
                const aspectRatio = mediaElement.videoWidth / mediaElement.videoHeight;
                mediaElement.height = maxHeight;
                mediaElement.width = maxHeight * aspectRatio;
            } else {
                mediaElement.width = mediaElement.videoWidth;
                mediaElement.height = mediaElement.videoHeight;
            }
            dimensionsDisplaying.textContent = `Displaying: ${formatDimension(mediaElement.width)}x${formatDimension(mediaElement.height)}`;
            dimensionsOriginal.textContent = `Original: ${mediaElement.videoWidth}x${mediaElement.videoHeight}`;
        }

        const width: number = isImage ? mediaElement.width : mediaElement.videoWidth;

        if (width < 200) {
            previewHeader.style.flexDirection = "column";
            previewHeader.style.alignItems = "center";
            previewHeader.style.justifyContent = "center";
            dimensionsDiv.style.textAlign = "center";
            dimensionsDiv.style.alignItems = "center";
            previewHeader.style.gap = "5px";
            previewHeader.insertBefore(fileNameSpan, previewHeader.firstChild);
        }
    };

    const showPreview = () => {
        timeout = setTimeout(() => {
            if (isMediaLoaded) {
                previewDiv.style.display = "block";
                positionPreviewDiv(previewDiv);
            }
            if (element) isOutlining ? element.style.outline = "" : element.style.border = "";

        }, hoverDelay);
    };

    const removePreview = () => {
        clearTimeout(timeout);
        timeout = null;
        isMediaLoaded = false;
        previewDiv.remove();
        if (element) {
            isOutlining ? element.style.outline = "" : element.style.border = "";
        }
    };

    const adjustPreviewSize = (e: WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            isManualResizing = true;
            const delta = e.deltaY > 0 ? -20 : 20;
            let newWidth: number;
            let aspectRatio: number;

            if (isImage) {
                newWidth = Math.max(100, mediaElement.width + delta);
                aspectRatio = mediaElement.naturalWidth / mediaElement.naturalHeight;

                mediaElement.width = newWidth;
                mediaElement.height = newWidth / aspectRatio;

                dimensionsDisplaying.textContent = `Displaying: ${formatDimension(mediaElement.width)}x${formatDimension(mediaElement.height)}`;
            } else if (isVideo) {
                newWidth = Math.max(100, mediaElement.clientWidth + delta);
                aspectRatio = mediaElement.videoWidth / mediaElement.videoHeight;

                mediaElement.style.width = `${newWidth}px`;
                mediaElement.style.height = `${newWidth / aspectRatio}px`;

                dimensionsDisplaying.textContent = `Displaying: ${formatDimension(newWidth)}x${formatDimension(newWidth / aspectRatio)}`;
            }

            positionPreviewDiv(previewDiv);
        }
    };

    element.addEventListener("mouseenter", () => {
        startLoading();
        isManualResizing = false;
        showPreview();
    });
    element.addEventListener("mouseleave", removePreview);
    element.addEventListener("wheel", adjustPreviewSize);

    eventListeners.push({ element, handler: showPreview });
    eventListeners.push({ element, handler: removePreview });
    eventListeners.push({ element, handler: adjustPreviewSize });

    function positionPreviewDiv(previewDiv) {
        const previewWidth = previewDiv.offsetWidth;
        const previewHeight = previewDiv.offsetHeight;
        const pageWidth = window.innerWidth;
        const pageHeight = window.innerHeight;

        let left = 0;
        let top = 0;

        switch (settings.store.previewPosition) {
            case "top-left":
                left = 10;
                top = 10;
                break;
            case "top-right":
                left = pageWidth - previewWidth - 10;
                top = 10;
                break;
            case "bottom-left":
                left = 10;
                top = pageHeight - previewHeight - 10;
                break;
            case "bottom-right":
                left = pageWidth - previewWidth - 10;
                top = pageHeight - previewHeight - 10;
                break;
            case "center":
            default:
                left = (pageWidth - previewWidth) / 2;
                top = (pageHeight - previewHeight) / 2;
                break;
        }

        if (left < 10) {
            left = 10;
        }
        if (top < 10) {
            top = 10;
        }
        if (left + previewWidth > pageWidth) {
            left = pageWidth - previewWidth - 10;
        }
        if (top + previewHeight > pageHeight) {
            top = pageHeight - previewHeight - 10;
        }

        previewDiv.style.left = `${left}px`;
        previewDiv.style.top = `${top}px`;
    }
}

function handleHover(elements: NodeListOf<HTMLElement> | HTMLElement[], type: string) {
    elements.forEach(el => {
        if (!el.dataset.hoverListenerAdded) {
            const handler = () => addHoverEffect(el, type);
            el.addEventListener("mouseover", handler);
            el.dataset.hoverListenerAdded = "true";
            eventListeners.push({ element: el, handler });
        }
    });
}

function isLinkAnImage(url: string) {
    const extension = url.split(".").pop();
    const [isImage,] = getMimeType(extension);
    return isImage;
}

function stripDiscordParams(url: string) {
    let newUrl = url.replace(/([?&])(width|size|height|h|w)=[^&]+/g, "");

    newUrl = newUrl.replace(/([?&])quality=[^&]*/g, "$1quality=lossless");

    newUrl = newUrl.replace(/([?&])+$/, "")
        .replace(/\?&/, "?")
        .replace(/\?$/, "")
        .replace(/&{2,}/g, "&");

    if (newUrl.includes("quality=lossless") && !newUrl.includes("?")) {
        newUrl = newUrl.replace(/&quality=lossless/, "?quality=lossless");
    }

    return newUrl;
}

const settings = definePluginSettings({
    messageImages: {
        type: OptionType.BOOLEAN,
        description: "Enable Message Images Hover Detection",
        default: true,
    },
    messageAvatars: {
        type: OptionType.BOOLEAN,
        description: "Enable Message Avatars Hover Detection",
        default: true,
    },
    messageLinks: {
        type: OptionType.BOOLEAN,
        description: "Enable Message Links Hover Detection",
        default: true,
    },
    messageStickers: {
        type: OptionType.BOOLEAN,
        description: "Enable Message Stickers Hover Detection",
        default: true,
    },
    hoverOutline: {
        type: OptionType.BOOLEAN,
        description: "Enable Hover Outline on Elements",
        default: true,
    },
    hoverOutlineColor: {
        type: OptionType.STRING,
        description: "Hover Outline Color",
        default: "red",
    },
    hoverOutlineSize: {
        type: OptionType.STRING,
        description: "Hover Outline Size",
        default: "1px",
    },
    hoverDelay: {
        type: OptionType.SLIDER,
        description: "Display Hover Delay (seconds)",
        markers: [0, 1, 2, 3, 4, 5],
        default: 1,
    },
    previewPosition: {
        type: OptionType.SELECT,
        description: "Preview Position",
        default: "center",
        options: [
            { value: "center", label: "Center" },
            { value: "top-left", label: "Top Left" },
            { value: "top-right", label: "Top Right" },
            { value: "bottom-left", label: "Bottom Left" },
            { value: "bottom-right", label: "Bottom Right" },
        ]
    }
});

export default definePlugin({
    name: "ImagePreview",
    description: "Hover on images, avatars, links, guild icons, and stickers to show a full preview.",
    authors: [EquicordDevs.creations],
    settings: settings,

    start() {
        let timeout: number | undefined;
        let previewDiv: HTMLDivElement | null = null;

        function initialScan() {
            const appContainer = document.querySelector('[class*="app-"]');
            if (appContainer) {
                if (settings.store.messageImages) {
                    handleHover(appContainer.querySelectorAll('[data-role="img"]'), "messageImages");
                }

                if (settings.store.messageAvatars) {
                    handleHover(appContainer.querySelectorAll('img[src*="cdn.discordapp.com/avatars/"], img[src*="cdn.discordapp.com/guilds/"], img[src^="/assets/"][class*="avatar"]'), "messageAvatars");
                }

                if (settings.store.messageLinks) {
                    appContainer.querySelectorAll("span").forEach(span => {
                        const url = span.textContent?.replace(/<[^>]*>?/gm, "");
                        if (url && (url.startsWith("http://") || url.startsWith("https://")) && isLinkAnImage(url)) {
                            handleHover([span], "messageLinks");
                        }
                    });
                }

                if (settings.store.messageStickers) {
                    handleHover(appContainer.querySelectorAll('img[data-type="sticker"]'), "messageStickers");
                }
            }
        }

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === "childList") {
                    mutation.removedNodes.forEach(removedNode => {
                        if (removedNode instanceof HTMLElement && lastHoveredElement && removedNode.contains(lastHoveredElement)) {
                            removePreview();
                        }
                    });
                    mutation.addedNodes.forEach(addedNode => {
                        if (addedNode instanceof HTMLElement) {
                            const element = addedNode as HTMLElement;

                            if (lastHoveredElement === element) return;
                            lastHoveredElement = element;

                            if (settings.store.messageImages) {
                                handleHover(element.querySelectorAll('[data-role="img"]'), "messageImages");
                            }

                            if (settings.store.messageAvatars) {
                                handleHover(element.querySelectorAll('img[src*="cdn.discordapp.com/avatars/"], img[src*="cdn.discordapp.com/guilds/"], img[src^="/assets/"][class*="avatar"]'), "messageAvatars");
                            }

                            if (settings.store.messageLinks) {
                                element.querySelectorAll("span").forEach(span => {
                                    const url = span.textContent?.replace(/<[^>]*>?/gm, "");
                                    if (url && (url.startsWith("http://") || url.startsWith("https://")) && isLinkAnImage(url)) {
                                        handleHover([span], "messageLinks");
                                    }
                                });
                            }

                            if (settings.store.messageStickers) {
                                handleHover(element.querySelectorAll('img[data-type="sticker"]'), "messageStickers");
                            }
                        }
                    });
                }
            });
        });

        const appContainer = document.querySelector('[class*="app-"]');
        if (appContainer) {
            observer.observe(appContainer, { childList: true, subtree: true });
        }

        initialScan();

        this.observer = observer;

        const removePreview = () => {
            if (timeout) clearTimeout(timeout);
            if (previewDiv) (previewDiv as HTMLDivElement).remove();
            lastHoveredElement = null;
        };
    },

    stop() {
        this.observer.disconnect();

        eventListeners.forEach(({ element, handler }) => {
            element.removeEventListener("mouseover", handler);
            element.removeEventListener("mouseenter", handler);
            element.removeEventListener("mouseleave", handler);
            element.removeEventListener("mousemove", handler);
        });

        eventListeners.length = 0;

        document.querySelectorAll("[data-hover-listener-added]").forEach(el => {
            el.removeAttribute("data-hover-listener-added");
            (el as HTMLElement).style.outline = "";
        });

        document.querySelectorAll(".preview-div").forEach(preview => {
            preview.remove();
        });
    }
});
