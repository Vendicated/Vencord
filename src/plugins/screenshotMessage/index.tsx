/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, showToast, Toasts } from "@webpack/common";
import * as htmlToImage from "html-to-image";

const logger = new Logger("ScreenshotMessage");

const ScreenshotIcon = ({ className }: { className?: string; }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className={className}>
        <path d="M4 4h4v2H4v4H2V4a2 2 0 0 1 2-2Zm16 0h-4v2h4v4h2V4a2 2 0 0 0-2-2ZM4 20h4v-2H4v-4H2v6a2 2 0 0 0 2 2Zm16 0h-4v-2h4v-4h2v6a2 2 0 0 1-2 2Z" />
        <circle cx="12" cy="12" r="4" />
    </svg>
);

const settings = definePluginSettings({
    outputMode: {
        type: OptionType.SELECT,
        description: "How to output the screenshot",
        options: [
            { label: "Download", value: "download", default: true },
            { label: "Copy to Clipboard", value: "clipboard" },
            { label: "Both", value: "both" }
        ]
    },
    padding: {
        type: OptionType.SLIDER,
        description: "Padding around the message",
        default: 16,
        markers: [0, 8, 16, 24, 32],
        stickToMarkers: false
    },
    borderRadius: {
        type: OptionType.SLIDER,
        description: "Border radius",
        default: 8,
        markers: [0, 4, 8, 12, 16],
        stickToMarkers: false
    },
    scale: {
        type: OptionType.SLIDER,
        description: "Image quality (2x recommended)",
        default: 2,
        markers: [1, 1.5, 2, 3, 4, 5, 10],
        stickToMarkers: false
    },
    transparentBackground: {
        type: OptionType.BOOLEAN,
        description: "Use transparent background instead of Discord theme color",
        default: false
    }
});

function findMessageElement(messageId: string): HTMLElement | null {
    const listItem = document.querySelector<HTMLElement>(`[data-list-item-id*="${messageId}"]`);
    if (!listItem) return null;
    const messageContainer = listItem.querySelector<HTMLElement>('[class*="message"][class*="cozy"], [class*="message"][class*="compact"]');
    return messageContainer || listItem;
}

async function embedImages(element: HTMLElement) {
    const images = Array.from(element.querySelectorAll("img"));
    await Promise.all(images.map(async img => {
        try {
            if (!img.src || img.src.startsWith("data:") || img.src.startsWith("blob:")) return;

            const response = await fetch(img.src);
            const blob = await response.blob();

            await new Promise<void>(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    img.src = reader.result as string;
                    img.srcset = "";
                    resolve();
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            // ignore errors, cuz why not
        }
    }));
}


function getAvatarUrl(author: Message["author"]): string {
    if (author.avatar) {
        const ext = author.avatar.startsWith("a_") ? "gif" : "webp";
        return `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.${ext}?size=128`;
    }
    // Default avatar based on discriminator or user id
    const defaultIndex = author.discriminator === "0"
        ? Number(BigInt(author.id) >> 22n) % 6
        : Number(author.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

function getDisplayName(author: Message["author"]): string {
    return (author as any).globalName || (author as any).global_name || author.username;
}

async function renderElementToPngBlob(element: HTMLElement, message: Message): Promise<Blob> {
    const { padding, borderRadius, scale, transparentBackground } = settings.store;


    const computedStyle = getComputedStyle(document.body);
    const themeBackground = computedStyle.getPropertyValue("--background-primary").trim() || "#313338";
    const backgroundColor = transparentBackground ? "transparent" : themeBackground;
    const textColor = computedStyle.getPropertyValue("--text-normal").trim() || "#dbdee1";
    const headerColor = computedStyle.getPropertyValue("--header-primary").trim() || "#f2f3f5";
    const timestampColor = computedStyle.getPropertyValue("--text-muted").trim() || "#949ba4";
    const interactiveColor = computedStyle.getPropertyValue("--interactive-normal").trim() || "#b5bac1";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 800px;
        background: ${backgroundColor};
        color: ${textColor};
        font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 16px;
        line-height: 1.375;
    `;

    const inner = document.createElement("div");
    inner.style.cssText = `
        padding: ${padding}px;
        background: ${backgroundColor};
        border-radius: ${borderRadius}px;
    `;

    const repliedMessageEl = element.querySelector('[class*="repliedMessage"]');
    let replyBar: HTMLElement | null = null;

    if (repliedMessageEl) {
        const replyAvatarSrc = repliedMessageEl.querySelector<HTMLImageElement>('img[class*="replyAvatar"], img[class*="avatar"]')?.src;
        const replyUsernameText = repliedMessageEl.querySelector('[class*="username"]')?.textContent || "Unknown";
        const replyContentText = repliedMessageEl.querySelector('[class*="repliedTextContent"], [class*="messageContent"]')?.textContent || "";

        replyBar = document.createElement("div");
        replyBar.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            margin-left: 36px;
            padding-left: 16px;
            position: relative;
        `;

        const spine = document.createElement("div");
        spine.style.cssText = `
            position: absolute;
            left: 20px;
            top: 50%;
            width: 33px;
            height: 13px;
            border-left: 2px solid ${interactiveColor};
            border-top: 2px solid ${interactiveColor};
            border-top-left-radius: 6px;
            opacity: 0.4;
        `;
        replyBar.appendChild(spine);

        const replyContentWrapper = document.createElement("div");
        replyContentWrapper.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
            margin-left: 36px;
            font-size: 0.875rem;
            color: ${timestampColor};
            overflow: hidden;
        `;

        if (replyAvatarSrc) {
            const replyAvatar = document.createElement("img");
            replyAvatar.src = replyAvatarSrc;
            replyAvatar.alt = "";
            replyAvatar.style.cssText = `
                width: 16px;
                height: 16px;
                border-radius: 50%;
                object-fit: cover;
            `;
            replyContentWrapper.appendChild(replyAvatar);
        }

        const replyUsername = document.createElement("span");
        replyUsername.textContent = replyUsernameText;
        replyUsername.style.cssText = `
            font-weight: 500;
            color: ${headerColor};
            opacity: 0.64;
            flex-shrink: 0;
        `;
        replyContentWrapper.appendChild(replyUsername);

        const replyContent = document.createElement("span");
        const contentText = replyContentText || "[Click to see attachment]";
        replyContent.textContent = contentText.length > 60 ? contentText.substring(0, 60) + "..." : contentText;
        replyContent.style.cssText = `
            color: ${textColor};
            opacity: 0.64;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        replyContentWrapper.appendChild(replyContent);

        replyBar.appendChild(replyContentWrapper);
    }

    const messageRow = document.createElement("div");
    messageRow.style.cssText = `
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 16px;
    `;

    const avatarContainer = document.createElement("div");
    avatarContainer.style.cssText = `
        flex-shrink: 0;
        width: 40px;
        height: 40px;
    `;

    const avatar = document.createElement("img");
    avatar.src = getAvatarUrl(message.author);
    avatar.alt = "";
    avatar.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
    `;
    avatarContainer.appendChild(avatar);

    const contentContainer = document.createElement("div");
    contentContainer.style.cssText = `
        flex: 1;
        min-width: 0;
    `;

    const header = document.createElement("div");
    header.style.cssText = `
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 4px;
    `;

    const username = document.createElement("span");
    username.textContent = getDisplayName(message.author);
    username.style.cssText = `
        font-weight: 500;
        color: ${headerColor};
        font-size: 1rem;
        line-height: 1.375;
    `;

    const timestamp = document.createElement("span");
    const msgDate = new Date(message.timestamp as any);
    timestamp.textContent = msgDate.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
    timestamp.style.cssText = `
        font-size: 0.75rem;
        color: ${timestampColor};
        font-weight: 400;
    `;

    header.appendChild(username);
    header.appendChild(timestamp);

    const elementClone = element.cloneNode(true) as HTMLElement;

    const replySelectors = [
        '[class*="repliedMessage"]',
        '[class*="referencedMessage"]',
        '[class*="repliedTextContent"]',
        '[class*="replyBar"]',
        '[class*="executedCommand"]'
    ];
    replySelectors.forEach(s => {
        elementClone.querySelectorAll(s).forEach(e => e.remove());
    });
    const originalContent = elementClone.querySelector('[class*="messageContent"], [class*="markup"]');
    const messageContent = (originalContent || document.createElement("div")).cloneNode(true) as HTMLElement;
    messageContent.style.cssText = "";

    const originalAccessories = elementClone.querySelector('[class*="accessories"], [class*="container"][id*="accessories"]');
    let accessoriesContent: HTMLElement | null = null;

    if (originalAccessories && originalAccessories.children.length > 0) {
        accessoriesContent = originalAccessories.cloneNode(true) as HTMLElement;
        accessoriesContent.style.cssText = "margin-top: 8px;";

        accessoriesContent.querySelectorAll("video").forEach(video => {
            const poster = video.poster || video.getAttribute("poster");
            if (poster) {
                const img = document.createElement("img");
                img.src = poster;
                img.style.cssText = video.style.cssText || "max-width: 400px; max-height: 300px; border-radius: 8px;";
                video.replaceWith(img);
            } else {
                const source = video.querySelector("source");
                const videoSrc = source?.src || video.src;
                if (videoSrc) {
                    const placeholder = document.createElement("div");
                    placeholder.style.cssText = `
                        background: linear-gradient(135deg, #5865F2 0%, #3C45A5 100%);
                        color: white;
                        padding: 20px 40px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 14px;
                    `;
                    placeholder.innerHTML = `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Video Attachment
                    `;
                    video.replaceWith(placeholder);
                } else {
                    video.remove();
                }
            }
        });

        accessoriesContent.querySelectorAll("img").forEach(img => {
            if (!img.style.maxWidth) {
                img.style.maxWidth = "400px";
            }
            if (!img.style.maxHeight) {
                img.style.maxHeight = "300px";
            }
            img.style.borderRadius = "8px";
        });

        accessoriesContent.querySelectorAll('[class*="hoverButton"], [class*="downloadButton"], [class*="mediaBarInteraction"]').forEach(e => e.remove());
    }

    const noiseSelectors = [
        '[class*="buttonContainer"]',
        '[class*="toolbar"]',
        '[class*="reactionBtn"]',
        '[class*="tooltip"]',
        '[class*="jumpButton"]',
        '[class*="hintContainer"]',
        '[class*="avatar"]',
        '[class*="header"]',
        '[aria-hidden="true"]:not(img):not([class*="emoji"])'
    ];
    noiseSelectors.forEach(s => {
        messageContent.querySelectorAll(s).forEach(e => e.remove());
    });

    contentContainer.appendChild(header);
    contentContainer.appendChild(messageContent);
    if (accessoriesContent) {
        contentContainer.appendChild(accessoriesContent);
    }

    messageRow.appendChild(avatarContainer);
    messageRow.appendChild(contentContainer);

    if (replyBar) {
        inner.appendChild(replyBar);
    }
    inner.appendChild(messageRow);
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    await embedImages(wrapper);

    await new Promise(resolve => setTimeout(resolve, 400));

    try {
        const dataUrl = await htmlToImage.toPng(inner, {
            pixelRatio: scale,
            backgroundColor: transparentBackground ? undefined : backgroundColor,
            cacheBust: true,
            style: { transform: "none", margin: "0" }
        });

        const response = await fetch(dataUrl);
        return await response.blob();
    } finally {
        document.body.removeChild(wrapper);
    }
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function copyBlobToClipboard(blob: Blob) {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

async function captureMessage(message: Message) {
    const element = findMessageElement(message.id);
    if (!element) {
        showToast("Message not found in view. Please scroll to it.", Toasts.Type.FAILURE);
        return;
    }

    try {
        showToast("Generating image...", Toasts.Type.MESSAGE);
        const blob = await renderElementToPngBlob(element, message);
        const { outputMode } = settings.store;

        if (outputMode === "download" || outputMode === "both") {
            downloadBlob(blob, `discord-${message.id}.png`);
        }
        if (outputMode === "clipboard" || outputMode === "both") {
            await copyBlobToClipboard(blob);
        }

        showToast("Screenshot captured successfully!", Toasts.Type.SUCCESS);
    } catch (err) {
        logger.error(err);
        showToast("Failed to capture screenshot. Check console for details.", Toasts.Type.FAILURE);
    }
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const group = findGroupChildrenByChildId("copy-text", children) || children;
    const insertIndex = (Array.isArray(group) ? group.findIndex(c => c?.props?.id === "copy-text") : -1) + 1;

    if (Array.isArray(group)) {
        group.splice(insertIndex || group.length, 0, (
            <Menu.MenuItem
                id="vc-screenshot-message"
                label="Screenshot Message"
                icon={ScreenshotIcon}
                action={() => captureMessage(message)}
            />
        ));
    }
};

export default definePlugin({
    name: "ScreenshotMessage",
    description: "Captures messages as high-quality PNGs while preserving Discord's theme and font.",
    authors: [Devs.mutelove],
    settings,
    contextMenus: { "message": messageContextMenuPatch },
    messagePopoverButton: {
        icon: ScreenshotIcon,
        render(message: Message) {
            return {
                label: "Screenshot Message",
                icon: ScreenshotIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => captureMessage(message)
            };
        }
    }
});
