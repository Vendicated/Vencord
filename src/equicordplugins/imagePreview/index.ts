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

function getMimeType(extension: string | undefined): [boolean, string] {
    if (!extension) return [false, ""];

    const lowerExt = extension.trim().toLowerCase();
    return [!!mimeTypes[lowerExt], mimeTypes[lowerExt] || ""];
}

function addHoverEffect(element: HTMLElement, type: string) {
    let hoverElementActual;

    if (settings.store.hoverOutline) {
        if (type === "messageImages") {
            hoverElementActual = element.closest('[id^="message-accessories-"]')?.querySelector("div")?.querySelector("div") || element;

            if (!(hoverElementActual instanceof HTMLDivElement)) {
                hoverElementActual = element;
            }
        } else {
            hoverElementActual = element.querySelector("img") || element;
        }

        hoverElementActual.style.outline = `${settings.store.hoverOutlineSize} dotted ${settings.store.hoverOutlineColor}`;
    }

    const url = element.getAttribute("data-safe-src") || element.getAttribute("src") || element.getAttribute("href") || element.textContent;

    if (!url) {
        hoverElementActual.style.outline = "";
        return;
    }

    const strippedUrl = stripDiscordParams(url);
    const fileName: string = strippedUrl.split("/").pop()?.split(/[?#&]/)[0] || "unknown";
    const [allowed, mimeType] = getMimeType(fileName.split(".").pop());

    if (!allowed) {
        hoverElementActual.style.outline = "";
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

    mediaElement.onload = mediaElement.onloadstart = () => {
        if (isImage) {
            dimensionsDisplaying.textContent = `Displaying: ${mediaElement.width}x${mediaElement.height}`;
            dimensionsOriginal.textContent = `Original: ${mediaElement.naturalWidth}x${mediaElement.naturalHeight}`;
        } else if (isVideo) {
            dimensionsDisplaying.textContent = `Displaying: ${mediaElement.videoWidth}x${mediaElement.videoHeight}`;
            dimensionsOriginal.textContent = `Original: ${mediaElement.videoWidth}x${mediaElement.videoHeight}`;
        }

        if (mediaElement.width < 200) {
            previewHeader.style.flexDirection = "column";
            previewHeader.style.alignItems = "center";
            previewHeader.style.justifyContent = "center";
            dimensionsDiv.style.textAlign = "center";
            dimensionsDiv.style.alignItems = "center";
            previewHeader.style.gap = "5px";
            previewHeader.insertBefore(fileNameSpan, previewHeader.firstChild);
        }
    };

    dimensionsDiv.appendChild(dimensionsDisplaying);
    dimensionsDiv.appendChild(dimensionsOriginal);
    previewHeader.appendChild(dimensionsDiv);

    previewDiv.appendChild(previewHeader);
    previewDiv.appendChild(mediaElement);

    document.body.appendChild(previewDiv);

    const hoverDelay = settings.store.hoverDelay * 1000;
    let timeout;

    const showPreview = () => {
        timeout = setTimeout(() => {
            previewDiv.style.display = "block";
            hoverElementActual.style.outline = `${settings.store.hoverOutlineSize} dotted ${settings.store.hoverOutlineColor}`;
            positionPreviewDiv(previewDiv, null);
        }, hoverDelay);
    };

    const movePreviewListener: (e: MouseEvent) => void = e => {
        positionPreviewDiv(previewDiv, e);
    };

    const removePreview = () => {
        clearTimeout(timeout);
        previewDiv.remove();
        document.removeEventListener("mousemove", movePreviewListener);
        if (hoverElementActual) {
            hoverElementActual.style.outline = "";
        }
    };

    element.addEventListener("mouseenter", showPreview);
    element.addEventListener("mouseleave", removePreview);
    document.addEventListener("mousemove", movePreviewListener);

    eventListeners.push({ element, handler: showPreview });
    eventListeners.push({ element, handler: removePreview });
    eventListeners.push({ element: previewDiv, handler: movePreviewListener });

    function positionPreviewDiv(previewDiv: HTMLElement, e: MouseEvent | null) {
        const previewWidth = previewDiv.offsetWidth;
        const previewHeight = previewDiv.offsetHeight;
        const pageWidth = window.innerWidth;
        const pageHeight = window.innerHeight;

        const mouseX = e ? e.pageX : window.innerWidth / 2;
        const mouseY = e ? e.pageY : window.innerHeight / 2;

        let left = mouseX + 10;
        let top = mouseY + 10;

        if (left + previewWidth > pageWidth) {
            left = pageWidth - previewWidth - 10;
        }
        if (top + previewHeight > pageHeight) {
            top = pageHeight - previewHeight - 10;
        }

        previewDiv.style.left = `${left}px`;
        previewDiv.style.top = `${top}px`;

        const maxImageWidth = pageWidth - 20;
        const maxImageHeight = pageHeight - 20;

        if (isImage) {
            if (mediaElement.naturalWidth > maxImageWidth || mediaElement.naturalHeight > maxImageHeight) {
                const aspectRatio = mediaElement.naturalWidth / mediaElement.naturalHeight;

                if (mediaElement.naturalWidth > maxImageWidth) {
                    mediaElement.width = maxImageWidth;
                    mediaElement.height = maxImageWidth / aspectRatio;
                }
                if (mediaElement.height > maxImageHeight) {
                    mediaElement.height = maxImageHeight;
                    mediaElement.width = maxImageHeight * aspectRatio;
                }
            } else {
                mediaElement.width = mediaElement.naturalWidth;
                mediaElement.height = mediaElement.naturalHeight;
            }
        }

        dimensionsDisplaying.textContent = isImage ? `Displaying: ${mediaElement.width}x${mediaElement.height}` : `Displaying: ${mediaElement.videoWidth}x${mediaElement.videoHeight}`;
        dimensionsOriginal.textContent = isImage ? `Original: ${mediaElement.naturalWidth}x${mediaElement.naturalHeight}` : `Original: ${mediaElement.videoWidth}x${mediaElement.videoHeight}`;
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
});

export default definePlugin({
    name: "ImagePreview",
    description: "Hover on images, avatars, links, guild icons, and stickers to show a full preview.",
    authors: [EquicordDevs.creations],
    settings: settings,

    start() {
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
