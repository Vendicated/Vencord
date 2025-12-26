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
import { findByPropsLazy } from "@webpack";
import { ChannelStore, Menu, MessageStore, showToast, ThemeStore, Toasts } from "@webpack/common";
import * as htmlToImage from "html-to-image";

const logger = new Logger("ScreenshotMessage");

const MessageClasses = findByPropsLazy("message", "cozyMessage", "groupStart");
const ReplyClasses = findByPropsLazy("repliedMessage", "replyAvatar", "replyBadge");
const AvatarClasses = findByPropsLazy("avatar", "clickable", "wrapper");

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

    const messageClass = MessageClasses?.message || MessageClasses?.cozyMessage;
    if (messageClass) {
        const messageContainer = listItem.querySelector<HTMLElement>(`.${messageClass.split(" ")[0]}`);
        if (messageContainer) return messageContainer;
    }

    return listItem;
}

async function embedImages(element: HTMLElement): Promise<void> {
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
        } catch { }
    }));
}

function getAvatarUrl(author: Message["author"], guildId?: string): string {
    try {
        const url = (author as any).getAvatarURL?.(guildId, 128, false);
        if (url) return url;
    } catch { }

    if (author.avatar) {
        const ext = author.avatar.startsWith("a_") ? "gif" : "webp";
        return `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.${ext}?size=128`;
    }

    const defaultIndex = author.discriminator === "0"
        ? Number(BigInt(author.id) >> 22n) % 6
        : Number(author.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}


function getDisplayName(author: Message["author"]): string {
    return (author as any).globalName || (author as any).global_name || author.username;
}

function getReferencedMessageData(message: Message): {
    authorName: string;
    authorAvatar: string;
    content: string;
} | null {
    const ref = message.messageReference;
    if (!ref?.message_id) return null;

    try {
        const channelMessages = MessageStore?.getMessages?.(ref.channel_id || message.channel_id);
        const referencedMessage = channelMessages?.get?.(ref.message_id) || (message as any).referencedMessage;

        if (referencedMessage?.author) {
            return {
                authorName: getDisplayName(referencedMessage.author),
                authorAvatar: getAvatarUrl(referencedMessage.author),
                content: referencedMessage.content || "[Attachment]"
            };
        }
    } catch (e) {
        logger.warn("Failed to get referenced message from store:", e);
    }

    const directRef = (message as any).referencedMessage;
    if (directRef?.author) {
        return {
            authorName: getDisplayName(directRef.author),
            authorAvatar: getAvatarUrl(directRef.author),
            content: directRef.content || "[Attachment]"
        };
    }

    return null;
}

function extractReplyFromElement(element: HTMLElement): {
    authorName: string;
    authorAvatar: string;
    content: string;
} | null {
    const replyClass = ReplyClasses?.repliedMessage;
    const repliedEl = replyClass
        ? element.querySelector(`.${replyClass.split(" ")[0]}`)
        : element.querySelector('[class*="repliedMessage"]');

    if (!repliedEl) return null;

    const avatarClass = ReplyClasses?.replyAvatar || AvatarClasses?.avatar;
    const avatarImg = avatarClass
        ? repliedEl.querySelector<HTMLImageElement>(`img.${avatarClass.split(" ")[0]}`)
        : repliedEl.querySelector<HTMLImageElement>('img[class*="avatar"]');

    const usernameEl = repliedEl.querySelector('[class*="username"]');
    const contentEl = repliedEl.querySelector('[class*="repliedTextContent"], [class*="messageContent"]');

    return {
        authorName: usernameEl?.textContent || "Unknown",
        authorAvatar: avatarImg?.src || "",
        content: contentEl?.textContent || ""
    };
}

function getThemeColors(): {
    background: string;
    text: string;
    header: string;
    muted: string;
    interactive: string;
} {
    const isLightTheme = ThemeStore?.theme === "light";
    const lightDefaults = {
        background: "#ffffff",
        text: "#313338",
        header: "#060607",
        muted: "#5c5e66",
        interactive: "#4e5058"
    };

    const darkDefaults = {
        background: "#313338",
        text: "#dbdee1",
        header: "#f2f3f5",
        muted: "#949ba4",
        interactive: "#b5bac1"
    };

    const defaults = isLightTheme ? lightDefaults : darkDefaults;

    const themedElement =
        document.querySelector(".theme-light, .theme-dark") ||
        document.querySelector("#app-mount") ||
        document.documentElement;

    const computed = getComputedStyle(themedElement);

    const readVar = (varName: string, fallback: string): string => {
        const value = computed.getPropertyValue(varName).trim();
        return value || fallback;
    };

    return {
        background: readVar("--background-primary", defaults.background),
        text: readVar("--text-normal", defaults.text),
        header: readVar("--header-primary", defaults.header),
        muted: readVar("--text-muted", defaults.muted),
        interactive: readVar("--interactive-normal", defaults.interactive)
    };
}


async function renderMessageToBlob(element: HTMLElement, message: Message): Promise<Blob> {
    const { padding, borderRadius, scale, transparentBackground } = settings.store;
    const colors = getThemeColors();
    const backgroundColor = transparentBackground ? "transparent" : colors.background;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 800px;
        background: ${backgroundColor};
        color: ${colors.text};
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

    const replyData = getReferencedMessageData(message) || extractReplyFromElement(element);
    let replyBar: HTMLElement | null = null;

    if (replyData) {
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
            border-left: 2px solid ${colors.interactive};
            border-top: 2px solid ${colors.interactive};
            border-top-left-radius: 6px;
            opacity: 0.4;
        `;
        replyBar.appendChild(spine);

        const replyContent = document.createElement("div");
        replyContent.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
            margin-left: 36px;
            font-size: 0.875rem;
            color: ${colors.muted};
            overflow: hidden;
        `;

        if (replyData.authorAvatar) {
            const avatar = document.createElement("img");
            avatar.src = replyData.authorAvatar;
            avatar.alt = "";
            avatar.style.cssText = "width: 16px; height: 16px; border-radius: 50%; object-fit: cover;";
            replyContent.appendChild(avatar);
        }

        const username = document.createElement("span");
        username.textContent = replyData.authorName;
        username.style.cssText = `font-weight: 500; color: ${colors.header}; opacity: 0.64; flex-shrink: 0;`;
        replyContent.appendChild(username);

        const content = document.createElement("span");
        const text = replyData.content || "[Click to see attachment]";
        content.textContent = text.length > 60 ? text.substring(0, 60) + "..." : text;
        content.style.cssText = `color: ${colors.text}; opacity: 0.64; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
        replyContent.appendChild(content);

        replyBar.appendChild(replyContent);
    }

    const messageRow = document.createElement("div");
    messageRow.style.cssText = "display: flex; flex-direction: row; align-items: flex-start; gap: 16px;";

    const avatarContainer = document.createElement("div");
    avatarContainer.style.cssText = "flex-shrink: 0; width: 40px; height: 40px;";

    const avatar = document.createElement("img");
    const channel = ChannelStore?.getChannel(message.channel_id);
    avatar.src = getAvatarUrl(message.author, channel?.guild_id);
    avatar.alt = "";
    avatar.style.cssText = "width: 40px; height: 40px; border-radius: 50%; object-fit: cover;";
    avatarContainer.appendChild(avatar);

    const contentContainer = document.createElement("div");
    contentContainer.style.cssText = "flex: 1; min-width: 0;";

    const header = document.createElement("div");
    header.style.cssText = "display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px;";

    const username = document.createElement("span");
    username.textContent = getDisplayName(message.author);
    username.style.cssText = `font-weight: 500; color: ${colors.header}; font-size: 1rem; line-height: 1.375;`;

    const timestamp = document.createElement("span");
    const msgDate = new Date(message.timestamp as any);
    timestamp.textContent = msgDate.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
    timestamp.style.cssText = `font-size: 0.75rem; color: ${colors.muted}; font-weight: 400;`;

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
            if (!img.style.maxWidth) img.style.maxWidth = "400px";
            if (!img.style.maxHeight) img.style.maxHeight = "300px";
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

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function copyBlobToClipboard(blob: Blob): Promise<void> {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

async function captureMessage(message: Message): Promise<void> {
    const element = findMessageElement(message.id);
    if (!element) {
        showToast("Message not found in view. Please scroll to it.", Toasts.Type.FAILURE);
        return;
    }

    try {
        showToast("Generating image...", Toasts.Type.MESSAGE);
        const blob = await renderMessageToBlob(element, message);
        const { outputMode } = settings.store;

        if (outputMode === "download" || outputMode === "both") {
            downloadBlob(blob, `discord-${message.id}.png`);
        }
        if (outputMode === "clipboard" || outputMode === "both") {
            await copyBlobToClipboard(blob);
        }

        showToast("Screenshot captured successfully!", Toasts.Type.SUCCESS);
    } catch (err) {
        logger.error("Failed to capture screenshot:", err);
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
