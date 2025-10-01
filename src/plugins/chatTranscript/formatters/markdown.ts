/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";

import type { FormatOptions } from "../types";
import { formatFileSize, getChannelDisplayName, getMessageDisplayName, sanitizeFilename } from "../utils";

interface MarkdownResult {
    content: string;
    mime: string;
    extension: string;
    filenameHint: string;
}

function buildMarkdownTranscript(messages: Message[], options: FormatOptions): MarkdownResult {
    const {
        channel,
        includeAttachments,
        includeEmbeds,
        includeReactions,
        includeEdits,
        includeMentions,
        includeReferenced
    } = options;

    const channelName = getChannelDisplayName(channel);
    const lines: string[] = [];

    lines.push(`# Transcript for ${channelName}`);
    lines.push(`- Exported at ${new Date().toISOString()}`);
    lines.push(`- Message count: ${messages.length}`);
    lines.push("");

    for (const message of messages) {
        const author = getMessageDisplayName(message);
        const timestamp = new Date(message.timestamp).toISOString();
        const flags: string[] = [];
        if (message.pinned) flags.push("pinned");
        if (includeEdits && message.edited_timestamp) flags.push(`edited ${new Date(message.edited_timestamp).toISOString()}`);

        lines.push(`## ${timestamp} — ${author} (${message.author?.id ?? "unknown"})${flags.length ? ` [${flags.join(", ")}]` : ""}`);

        if (message.content) {
            lines.push(message.content);
        }

        if (includeReferenced && message.referenced_message) {
            const ref = message.referenced_message;
            const refAuthor = getMessageDisplayName(ref);
            const refTimestamp = ref.timestamp ? new Date(ref.timestamp).toISOString() : "unknown";
            lines.push(`> Replying to ${refAuthor} (${refTimestamp})`);
            if (ref.content) lines.push(`> ${ref.content.replace(/\n/g, "\n> ")}`);
        }

        if (includeAttachments && message.attachments?.length) {
            lines.push("Attachments:");
            for (const attachment of message.attachments) {
                const label = attachment.filename ?? attachment.url ?? attachment.id;
                const size = formatFileSize(attachment.size);
                lines.push(`- [${label}](${attachment.url})${size ? ` (${size})` : ""}`);
            }
        }

        if (includeEmbeds && message.embeds?.length) {
            lines.push("Embeds:");
            for (const embed of message.embeds) {
                const title = embed.title ?? "Untitled Embed";
                const desc = embed.description ? ` — ${embed.description.replace(/\n/g, " ")}` : "";
                const url = embed.url ? ` (${embed.url})` : "";
                lines.push(`- ${title}${desc}${url}`);
                if (embed.fields?.length) {
                    embed.fields.forEach(field => {
                        lines.push(`  - ${field.name ?? "Field"}: ${field.value ?? ""}`);
                    });
                }
            }
        }

        if (includeReactions && message.reactions?.length) {
            const reactionLine = message.reactions
                .map(r => `${r.emoji.name ?? r.emoji.id ?? "emoji"} × ${r.count}`)
                .join(", ");
            lines.push(`Reactions: ${reactionLine}`);
        }

        if (includeMentions && message.mentions?.length) {
            lines.push("Mentions:");
            for (const mention of message.mentions) {
                const name = mention.global_name ?? mention.username ?? mention.id;
                lines.push(`- @${name} (${mention.id})`);
            }
        }

        lines.push("");
    }

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const rangeHint = `${firstMessage ? new Date(firstMessage.timestamp).toISOString() : "start"}_${lastMessage ? new Date(lastMessage.timestamp).toISOString() : "end"}`;
    const filenameHint = sanitizeFilename(`${channelName}_${rangeHint}`);

    return {
        content: lines.join("\n"),
        mime: "text/markdown;charset=utf-8",
        extension: "md",
        filenameHint
    };
}

export { buildMarkdownTranscript };

