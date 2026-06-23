/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { MessageObject } from "@api/MessageEvents";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { User } from "@vencord/discord-types";
import characterCounter from "@plugins/characterCounter";
import ErrorBoundary from "@components/ErrorBoundary";
import { classNameFactory } from "@utils/css";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { classes } from "@utils/misc";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { DraftType, UserStore } from "@webpack/common";

const cl = classNameFactory("vc-splitLargeMessages-");

const settings = definePluginSettings({
    delay: {
        type: OptionType.SLIDER,
        description: "Delay before prefilling the next chunk (seconds)",
        markers: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5],
        default: 1,
        stickToMarkers: true
    },
    byNewlines: {
        type: OptionType.BOOLEAN,
        description: "Split on newlines instead of spaces",
        default: false
    },
    leaveGaps: {
        type: OptionType.BOOLEAN,
        description: "Preserve empty lines when splitting on newlines",
        default: false
    }
});

const DEFAULT_LIMITS = {
    standard: 2000,
    premium: 4000
};
const SAFE_MARGIN = 10;
const CHUNK_BUFFER_FRACTION = 0.95;

const NitroUtils = findByPropsLazy("canUseIncreasedMessageLength") as {
    canUseIncreasedMessageLength?: (user: User) => boolean;
};

const DraftManager = findByPropsLazy("clearDraft", "saveDraft") as {
    clearDraft?: (channelId: string, draftType: number) => void;
};

const pendingChunks = new Map<string, string[]>();
let currentTimeout: ReturnType<typeof setTimeout> | null = null;

function getActiveLimit() {
    const user = UserStore.getCurrentUser();
    const canUseIncreased = NitroUtils?.canUseIncreasedMessageLength?.(user) ?? false;
    return canUseIncreased ? DEFAULT_LIMITS.premium : DEFAULT_LIMITS.standard;
}

function getSplitLimit() {
    return Math.max(1, getActiveLimit() - SAFE_MARGIN);
}

function queueNextChunk(channelId: string) {
    const chunks = pendingChunks.get(channelId);
    if (!chunks?.length) {
        pendingChunks.delete(channelId);
        return;
    }

    const nextChunk = chunks.shift();
    if (!chunks.length) pendingChunks.delete(channelId);
    if (!nextChunk) return;

    const delayMs = Math.max(0, (settings.store.delay ?? 1) * 1000);
    currentTimeout = setTimeout(() => {
        currentTimeout = null;
        DraftManager?.clearDraft?.(channelId, DraftType.ChannelMessage);
        insertTextIntoChatInputBox(nextChunk);
    }, delayMs);
}

export default definePlugin({
    name: "SplitLargeMessages",
    description: "Splits long messages that exceed the character limit and automatically queues the next part in your chat box after sending.",
    tags: ["Chat", "Utility"],
    authors: [Devs.lucabeyer],
    settings,

    patches: [
        {
            find: "Message Too Long Alert",
            replacement: {
                match: /let (\i)=\i\?\i\.\i:\i\.\i;/,
                replace: "let $1=1e9;"
            }
        },
        {
            find: "convertedStringToFile",
            replacement: {
                match: /\.uploadLongMessages\?\i\?\?\i:null/,
                replace: ".uploadLongMessages?null:null"
            }
        },
        {
            find: ".CREATE_FORUM_POST||",
            replacement: {
                match: /(?<=textValue:(\i),editorHeight:\i,channelId:\i\.id\}\)),/,
                replace: ",$self.renderSplitCounter({text:$1}),"
            }
        },
        {
            find: "upsellLongMessages?.iconOnly",
            replacement: {
                match: /if\(!\((\i&&\i>=0\|\|!\i\|\|\i&&!\i)\)\)return null;/,
                replace: "return null;"
            }
        }
    ],

    renderSplitCounter: ErrorBoundary.wrap(({ text }: { text: string; }) => {
        const limit = getSplitLimit();
        if (!text.length || text.length <= limit) return null;

        const count = splitMessageSafe(text, limit).filter(c => c.length > 0).length;
        if (count <= 1) return null;

        const isCharCounterActive = isPluginEnabled(characterCounter.name);

        return (
            <div className={classes(cl("counter"), isCharCounterActive && cl("shifted"))}>
                <span>{count}</span>
                <span> messages</span>
            </div>
        );
    }, { noop: true }),

    stop() {
        pendingChunks.clear();
        if (currentTimeout) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }
    },

    onBeforeMessageSend(channelId: string, message: MessageObject) {
        const content = message.content ?? "";
        const limit = getSplitLimit();
        if (pendingChunks.has(channelId)) {
            if (content.length > 0) queueNextChunk(channelId);
            return;
        }

        if (content.length <= limit) return;

        const messageChunks = splitMessageSafe(content, limit).filter(c => c.length > 0);
        if (!messageChunks.length) return;

        message.content = messageChunks.shift()!;

        if (messageChunks.length > 0) {
            pendingChunks.set(channelId, messageChunks);
            queueNextChunk(channelId);
        }
    }
});

function splitMessageSafe(text: string, limit: number): string[] {
    if (text.length <= limit) return [text];
    const separator = settings.store.byNewlines ? "\n" : " ";
    const tokens = tokenize(text, separator, limit);
    const chunks = buildChunks(tokens, separator, Math.floor(limit * CHUNK_BUFFER_FRACTION));
    return repairCodeblocks(chunks, settings.store.leaveGaps, separator);
}

function tokenize(text: string, separator: string, maxTokenLength: number): string[] {
    const raw = text.replace(/\t/g, " ").split(separator);
    const tokens: string[] = [];

    for (const token of raw) {
        if (token.length <= maxTokenLength) {
            tokens.push(token);
            continue;
        }
        let remaining = token;
        while (remaining.length > maxTokenLength) {
            tokens.push(remaining.slice(0, maxTokenLength));
            remaining = remaining.slice(maxTokenLength);
        }
        if (remaining.length > 0) tokens.push(remaining);
    }

    return tokens;
}

function buildChunks(tokens: string[], separator: string, chunkLimit: number): string[] {
    const chunks: string[] = [];
    let current = "";

    for (const token of tokens) {
        const candidate = current.length > 0 ? current + separator + token : token;
        if (current.length > 0 && candidate.length > chunkLimit) {
            chunks.push(current);
            current = token;
        } else {
            current = candidate;
        }
    }

    if (current.length > 0) chunks.push(current);
    return chunks;
}

function repairCodeblocks(chunks: string[], leaveGaps: boolean, separator: string): string[] {
    const FENCED_BLOCK = /`{3,}([\w-]*)\n|`{3,}/gm;
    const INLINE_CODE = /(?<=[^`]|^)`{1,2}(?=[^`])/gm;

    let pendingBlockOpen: string | null = null;
    let pendingInlineOpen: string | null = null;

    for (let i = 0; i < chunks.length; i++) {
        if (pendingBlockOpen) {
            chunks[i] = pendingBlockOpen + chunks[i];
            pendingBlockOpen = null;
        } else if (pendingInlineOpen) {
            chunks[i] = pendingInlineOpen + chunks[i];
            pendingInlineOpen = null;
        } else if (leaveGaps && separator === "\n" && chunks[i].startsWith("\n")) {
            chunks[i] = "** **" + chunks[i];
        }

        const fenceMatches = [...chunks[i].matchAll(FENCED_BLOCK)];
        if (fenceMatches.length % 2 === 1) {
            const lastFence = fenceMatches[fenceMatches.length - 1];
            const lang = lastFence[1] ?? "";
            chunks[i] += "\n```";
            pendingBlockOpen = "```" + lang + (lang ? "\n" : "");
        } else {
            const inlineMatches = [...chunks[i].matchAll(INLINE_CODE)];
            if (inlineMatches.length % 2 === 1) {
                const backticks = inlineMatches[inlineMatches.length - 1][0];
                chunks[i] += backticks;
                pendingInlineOpen = backticks;
            }
        }

        if (leaveGaps && separator === "\n" && chunks[i].endsWith("\n")) {
            chunks[i] += "** **";
        }
    }

    return chunks.filter(c => c.length > 0);
}
