/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";

import type { FormatOptions } from "../types";
import {
    buildAvatarUrl,
    escapeAttribute,
    escapeHtml,
    formatFileSize,
    getChannelDisplayName,
    getMessageDisplayName,
    sanitizeFilename
} from "../utils";

interface HtmlResult {
    content: string;
    mime: string;
    extension: string;
    filenameHint: string;
}

function renderAttachment(attachment: NonNullable<Message["attachments"]>[number]) {
    const url = escapeAttribute(attachment.url);
    const name = escapeHtml(attachment.filename ?? attachment.id ?? attachment.url);
    const size = formatFileSize(attachment.size);
    const type = attachment.content_type ?? "";

    if (type.startsWith("image/")) {
        return `<figure class="attachment attachment-image"><img src="${url}" alt="${name}" loading="lazy" /><figcaption>${name}${size ? ` (${size})` : ""}</figcaption></figure>`;
    }

    if (type.startsWith("video/")) {
        return `<figure class="attachment attachment-video"><video controls preload="metadata" src="${url}"></video><figcaption>${name}${size ? ` (${size})` : ""}</figcaption></figure>`;
    }

    if (type.startsWith("audio/")) {
        return `<figure class="attachment attachment-audio"><audio controls preload="metadata" src="${url}"></audio><figcaption>${name}${size ? ` (${size})` : ""}</figcaption></figure>`;
    }

    if (type === "application/pdf") {
        return `<figure class="attachment attachment-embed"><embed src="${url}" type="application/pdf" /><figcaption>${name}${size ? ` (${size})` : ""}</figcaption></figure>`;
    }

    return `<div class="attachment attachment-file"><a href="${url}">${name}</a>${size ? ` <span class="filesize">(${size})</span>` : ""}</div>`;
}

function renderEmbed(embed: NonNullable<Message["embeds"]>[number]) {
    const color = embed.color != null ? `border-color: #${embed.color.toString(16).padStart(6, "0")};` : "";
    const author = embed.author ? `
            <div class="embed-author">
                ${embed.author.icon_url ? `<img class="embed-author-icon" src="${escapeAttribute(embed.author.icon_url)}" alt="" loading="lazy" />` : ""}
                <span class="embed-author-name">${escapeHtml(embed.author.name ?? "")}</span>
                ${embed.author.url ? `<a class="embed-author-link" href="${escapeAttribute(embed.author.url)}">Open</a>` : ""}
            </div>` : "";

    const title = embed.title ? `<div class="embed-title">${embed.url ? `<a href="${escapeAttribute(embed.url)}">${escapeHtml(embed.title)}</a>` : escapeHtml(embed.title)}</div>` : "";
    const description = embed.description ? `<div class="embed-description">${escapeHtml(embed.description).replace(/\n/g, "<br />")}</div>` : "";

    const fields = embed.fields?.length ? `
            <div class="embed-fields">
                ${embed.fields.map(field => `
                    <div class="embed-field${field.inline ? " inline" : ""}">
                        <div class="embed-field-name">${escapeHtml(field.name ?? "")}</div>
                        <div class="embed-field-value">${escapeHtml(field.value ?? "").replace(/\n/g, "<br />")}</div>
                    </div>
                `).join("")}
            </div>
        ` : "";

    const image = embed.image?.url
        ? `<div class="embed-media embed-image"><img src="${escapeAttribute(embed.image.url)}" alt="" loading="lazy" /></div>`
        : "";

    const thumbnail = embed.thumbnail?.url
        ? `<div class="embed-thumbnail"><img src="${escapeAttribute(embed.thumbnail.url)}" alt="" loading="lazy" /></div>`
        : "";

    const video = embed.video?.url
        ? `<div class="embed-media embed-video"><video controls preload="metadata" src="${escapeAttribute(embed.video.url)}"></video></div>`
        : "";

    const footer = embed.footer
        ? `<div class="embed-footer">${embed.footer.icon_url ? `<img class="embed-footer-icon" src="${escapeAttribute(embed.footer.icon_url)}" alt="" loading="lazy" />` : ""}<span>${escapeHtml(embed.footer.text ?? "")}</span>${embed.timestamp ? `<span class="embed-footer-timestamp">${escapeHtml(new Date(embed.timestamp).toLocaleString())}</span>` : ""}</div>`
        : "";

    return `
        <div class="embed" style="${color}">
            <div class="embed-content">
                ${author}
                ${title}
                ${description}
                ${fields}
                ${footer}
            </div>
            ${thumbnail}
            ${image}
            ${video}
        </div>
    `;
}

function renderReactions(message: Message) {
    if (!message.reactions?.length) return "";
    const items = message.reactions.map(reaction => {
        const emoji = reaction.emoji;
        const label = emoji.id
            ? `<img class="reaction-emoji" src="https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}" alt="${escapeHtml(emoji.name ?? "emoji")}" />`
            : escapeHtml(emoji.name ?? "emoji");
        return `<span class="reaction">${label}<span class="reaction-count">${reaction.count}</span></span>`;
    }).join("");

    return `<div class="reactions">${items}</div>`;
}

function renderMentions(message: Message) {
    if (!message.mentions?.length) return "";
    return `
        <div class="mention-list">
            ${message.mentions.map(mention => {
                const name = mention.global_name ?? mention.username ?? mention.id;
                return `<span class="mention">@${escapeHtml(name)}<span class="mention-meta"> (${mention.id})</span></span>`;
            }).join("")}
        </div>
    `;
}

function renderReply(message: Message) {
    const ref = message.referenced_message;
    if (!ref) return "";
    const author = getMessageDisplayName(ref);
    const timestamp = ref.timestamp ? new Date(ref.timestamp).toLocaleString() : "unknown";
    const content = ref.content ? escapeHtml(ref.content).replace(/\n/g, "<br />") : "";
    return `
        <div class="reply">
            <div class="reply-meta">Replying to ${escapeHtml(author)} (${escapeHtml(timestamp)})</div>
            ${content ? `<div class="reply-content">${content}</div>` : ""}
        </div>
    `;
}

function buildMessageLink(message: Message, channelId: string, guildId?: string | null) {
    const guildSegment = guildId ?? message.guild_id ?? "@me";
    return `https://discord.com/channels/${guildSegment}/${channelId}/${message.id}`;
}

function buildHtmlTranscript(messages: Message[], options: FormatOptions): HtmlResult {
    const {
        channel,
        includeAttachments,
        includeEmbeds,
        includeReactions,
        includeEdits,
        includeMentions,
        includeReferenced,
        groupByDay
    } = options;

    const channelName = getChannelDisplayName(channel);
    const now = new Date();

    const css = `
        :root { color-scheme: dark; }
        body { font-family: system-ui,-apple-system,"Segoe UI",sans-serif; background: #313338; color: #f2f3f5; margin: 0; padding: 32px; }
        header { margin-bottom: 24px; }
        header h1 { margin: 0 0 8px 0; font-size: 24px; }
        header p { margin: 4px 0; color: #b5bac1; }
        .transcript { display: flex; flex-direction: column; gap: 12px; }
        .message { display: grid; grid-template-columns: 48px 1fr; gap: 12px; padding: 12px; border-radius: 8px; background: rgba(49, 51, 56, 0.65); position: relative; }
        .avatar img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
        .message-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
        .message-author { font-weight: 600; color: #fff; cursor: pointer; }
        .message-username { color: #b5bac1; font-size: 12px; }
        .message-timestamp { color: #b5bac1; font-size: 12px; }
        .message-edited { color: #949ba4; font-size: 12px; }
        .message-pinned { margin-left: auto; color: #f1c40f; font-size: 12px; }
        .message-content { margin-top: 4px; white-space: pre-wrap; word-break: break-word; }
        .attachments { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
        .attachment figure { margin: 0; }
        .attachment figcaption { margin-top: 6px; color: #b5bac1; font-size: 12px; }
        .attachment-image img, .embed-image img { max-width: 100%; border-radius: 8px; background: #1e1f22; }
        .attachment-video video, .embed-video video { max-width: 100%; border-radius: 8px; background: #1e1f22; }
        .attachment-audio audio { width: 100%; }
        .attachment-file a { color: #8592ff; text-decoration: none; }
        .attachment-file a:hover { text-decoration: underline; }
        .filesize { color: #b5bac1; }
        .embeds { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
        .embed { border-left: 4px solid rgba(88,101,242,0.7); background: #2b2d31; padding: 12px; border-radius: 8px; display: grid; grid-template-columns: 1fr auto; gap: 12px; }
        .embed-thumbnail img { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; }
        .embed-author { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; }
        .embed-author-icon { width: 24px; height: 24px; border-radius: 50%; }
        .embed-title { font-weight: 600; margin-bottom: 6px; }
        .embed-title a { color: #fff; text-decoration: none; }
        .embed-title a:hover { text-decoration: underline; }
        .embed-description { color: #e3e5e8; font-size: 14px; }
        .embed-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin-top: 8px; }
        .embed-field { background: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px; }
        .embed-field.inline { grid-column: span 1; }
        .embed-field-name { font-weight: 600; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; color: #949ba4; }
        .embed-field-value { font-size: 14px; }
        .embed-footer { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; color: #949ba4; }
        .embed-footer-icon { width: 20px; height: 20px; border-radius: 50%; }
        .reactions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .reaction { display: flex; align-items: center; gap: 6px; background: rgba(88,101,242,0.2); border: 1px solid rgba(88,101,242,0.5); padding: 4px 8px; border-radius: 999px; font-size: 12px; }
        .reaction-emoji { width: 20px; height: 20px; }
        .reaction-count { font-weight: 600; }
        .mention-list { margin-top: 8px; color: #b5bac1; font-size: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
        .mention { background: rgba(88,101,242,0.15); padding: 4px 6px; border-radius: 6px; }
        .mention-meta { color: #8a8e93; }
        .reply { border-left: 2px solid rgba(255,255,255,0.2); padding-left: 12px; margin-top: 8px; color: #b5bac1; }
        .reply-meta { font-size: 12px; margin-bottom: 4px; }
        .day-separator { margin: 32px 0 8px 0; font-size: 14px; color: #b5bac1; position: relative; }
        .day-separator::after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: rgba(255,255,255,0.08); z-index: -1; }
        .day-separator span { background: #313338; padding-right: 8px; }
        .context-menu { position: fixed; z-index: 9999; background: #111214; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; min-width: 180px; padding: 4px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.35); display: none; }
        .context-menu.visible { display: block; }
        .context-menu button { width: 100%; padding: 8px 12px; background: none; border: none; color: #f2f3f5; text-align: left; font-size: 14px; cursor: pointer; }
        .context-menu button:hover { background: rgba(88,101,242,0.3); }
    `;

    const menuHtml = `
        <div id="transcript-context-menu" class="context-menu" role="menu">
            <button type="button" data-action="copy-user">Copy User ID</button>
            <button type="button" data-action="copy-message">Copy Message ID</button>
            <button type="button" data-action="copy-link">Copy Message Link</button>
            <button type="button" data-action="open">Open in Discord</button>
        </div>
    `;

    const script = `
        const ctxMenu = document.getElementById('transcript-context-menu');
        let ctxTarget = null;
        document.addEventListener('contextmenu', event => {
            const message = event.target.closest('.message');
            if (!message) return;
            event.preventDefault();
            ctxTarget = message;
            ctxMenu.style.left = event.clientX + 'px';
            ctxMenu.style.top = event.clientY + 'px';
            ctxMenu.classList.add('visible');
        });

        document.addEventListener('click', () => {
            ctxMenu.classList.remove('visible');
        });

        ctxMenu.addEventListener('click', async event => {
            const button = event.target.closest('button[data-action]');
            if (!button || !ctxTarget) return;
            const action = button.dataset.action;
            const userId = ctxTarget.dataset.userId;
            const messageId = ctxTarget.dataset.messageId;
            const link = ctxTarget.dataset.link;

            async function copy(text) {
                try {
                    await navigator.clipboard.writeText(text);
                } catch (error) {
                    console.error('Clipboard error', error);
                }
            }

            if (action === 'copy-user' && userId) {
                copy(userId);
            }

            if (action === 'copy-message' && messageId) {
                copy(messageId);
            }

            if (action === 'copy-link' && link) {
                copy(link);
            }

            if (action === 'open' && link) {
                window.open(link, '_blank');
            }

            ctxMenu.classList.remove('visible');
        });
    `;

    const parts: string[] = [];
    parts.push(
        "<!DOCTYPE html>",
        "<html lang=\"en\">",
        "<head>",
        "<meta charset=\"utf-8\" />",
        `<title>${escapeHtml(channelName)} Transcript</title>`,
        `<style>${css}</style>`,
        "</head>",
        "<body>",
        "<header>",
        `<h1>${escapeHtml(channelName)} Transcript</h1>`,
        `<p>Exported ${escapeHtml(now.toLocaleString())}</p>`,
        `<p>Total messages: ${messages.length}</p>`,
        "</header>",
        "<main class=\"transcript\">"
    );

    let currentDay = "";

    for (const message of messages) {
        const timestamp = new Date(message.timestamp);
        const dayLabel = timestamp.toLocaleDateString();

        if (groupByDay && dayLabel !== currentDay) {
            currentDay = dayLabel;
            parts.push(`<div class=\"day-separator\"><span>${escapeHtml(dayLabel)}</span></div>`);
        }

        const authorName = getMessageDisplayName(message);
        const timestampLabel = timestamp.toLocaleString();
        const avatar = buildAvatarUrl(message, 96);
        const content = message.content ? escapeHtml(message.content).replace(/\n/g, "<br />") : "";
        const messageLink = buildMessageLink(message, message.channel_id, channel?.guild_id ?? message.guild_id);

        const attachments = includeAttachments && message.attachments?.length
            ? `<div class="attachments">${message.attachments.map(renderAttachment).join("")}</div>`
            : "";

        const embeds = includeEmbeds && message.embeds?.length
            ? `<div class="embeds">${message.embeds.map(renderEmbed).join("")}</div>`
            : "";

        const reactions = includeReactions ? renderReactions(message) : "";
        const mentions = includeMentions ? renderMentions(message) : "";
        const reply = includeReferenced ? renderReply(message) : "";

        parts.push(`
            <article
                class="message"
                data-message-id="${message.id}"
                data-user-id="${message.author?.id ?? ""}"
                data-channel-id="${message.channel_id}"
                data-guild-id="${message.guild_id ?? channel?.guild_id ?? ""}"
                data-link="${escapeAttribute(messageLink)}"
            >
                <div class="avatar"><img src="${escapeAttribute(avatar)}" alt="" loading="lazy" /></div>
                <div class="message-body">
                    <div class="message-header">
                        <span class="message-author">${escapeHtml(authorName)}</span>
                        <span class="message-username">${escapeHtml(message.author?.username ?? "")}${message.author?.discriminator && message.author.discriminator !== "0" ? `#${message.author.discriminator}` : ""}</span>
                        <span class="message-timestamp">${escapeHtml(timestampLabel)}</span>
                        ${includeEdits && message.edited_timestamp ? `<span class="message-edited">(edited ${escapeHtml(new Date(message.edited_timestamp).toLocaleString())})</span>` : ""}
                        ${message.pinned ? `<span class="message-pinned">?? pinned</span>` : ""}
                    </div>
                    ${reply}
                    ${content ? `<div class="message-content">${content}</div>` : ""}
                    ${attachments}
                    ${embeds}
                    ${reactions}
                    ${mentions}
                </div>
            </article>
        `);
    }

    parts.push(
        "</main>",
        menuHtml,
        `<script>${script}</script>`,
        "</body>",
        "</html>"
    );

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const rangeHint = `${firstMessage ? new Date(firstMessage.timestamp).toISOString() : "start"}_${lastMessage ? new Date(lastMessage.timestamp).toISOString() : "end"}`;
    const filenameHint = sanitizeFilename(`${channelName}_${rangeHint}`);

    return {
        content: parts.join("\n"),
        mime: "text/html;charset=utf-8",
        extension: "html",
        filenameHint
    };
}

export { buildHtmlTranscript };

