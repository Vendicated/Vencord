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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Message } from "@vencord/discord-types";
import { ChannelStore, Parser, useEffect, useRef, useState, UserStore } from "@webpack/common";

import { BaseConverterIcon } from "./BaseConverterIcon";
import { settings } from "./settings";
import { cl, ConversionResult, decode, EncodingType } from "./utils";

const ConversionSetters = new Map<string, (v: ConversionResult) => void>();
const DecodedMessages = new Map<string, ConversionResult>();
const ReplyListeners = new Map<string, Set<(v: ConversionResult) => void>>();

function notifyDecode(messageId: string, data: ConversionResult) {
    DecodedMessages.set(messageId, data);
    ReplyListeners.get(messageId)?.forEach(fn => fn(data));
}

export function handleDecode(messageId: string, data: ConversionResult) {
    notifyDecode(messageId, data);
    ConversionSetters.get(messageId)?.(data);
}

function findMessageContentEl(messageId: string): HTMLElement | null {
    return document.getElementById(`message-content-${messageId}`);
}

export function BaseConverterAccessory({ message }: { message: Message; }) {
    const { autoDecodeReceived, receiveEncoding, aesSecret, userKeys } = settings.use(["autoDecodeReceived", "receiveEncoding", "aesSecret", "userKeys"]);
    const authorId: string | undefined = (message as any).author?.id;
    const currentUserId = UserStore.getCurrentUser()?.id;

    // For your own messages in a DM the author is YOU, so userKeys[authorId] is
    // meaningless. Use the DM partner's key instead, since that's who you encoded for.
    let effectiveKey: string;
    if (authorId && authorId === currentUserId) {
        const channel = ChannelStore.getChannel(message.channel_id);
        const partnerRaw = (channel as any)?.recipients?.[0];
        const partnerId: string | undefined = typeof partnerRaw === "string" ? partnerRaw : partnerRaw?.id;
        effectiveKey = (partnerId && userKeys?.[partnerId]) ? userKeys[partnerId] : aesSecret;
    } else {
        effectiveKey = (authorId && userKeys?.[authorId]) ? userKeys[authorId] : aesSecret;
    }
    const [result, setResult] = useState<ConversionResult | undefined>();
    const [showOriginal, setShowOriginal] = useState(false);
    const containerRef = useRef<HTMLSpanElement>(null);

    const referencedMessageId = (message as any).messageReference?.messageId
        ?? (message as any).messageReference?.message_id;

    const [referenceResult, setReferenceResult] = useState<ConversionResult | undefined>(
        () => referencedMessageId ? DecodedMessages.get(referencedMessageId) : undefined
    );

    useEffect(() => {
        if (!referencedMessageId) return;
        const set = ReplyListeners.get(referencedMessageId) ?? new Set();
        set.add(setReferenceResult);
        ReplyListeners.set(referencedMessageId, set);
        return () => {
            set.delete(setReferenceResult);
            if (!set.size) ReplyListeners.delete(referencedMessageId);
        };
    }, [referencedMessageId]);

    useEffect(() => {
        if ((message as any).vencordEmbeddedBy) return;

        ConversionSetters.set(message.id, setResult);

        if (autoDecodeReceived && message.content) {
            decode(message.content, receiveEncoding as EncodingType, effectiveKey)
                .then(decoded => {
                    if (decoded) {
                        setResult(decoded);
                        notifyDecode(message.id, decoded);
                    }
                })
                .catch(() => { /* silent — auto-decode is best-effort */ });
        }

        return () => void ConversionSetters.delete(message.id);
    }, [message.id, autoDecodeReceived, receiveEncoding, effectiveKey]);

    // Hide the original encrypted message content when decoded; show when toggled
    useEffect(() => {
        const mc = findMessageContentEl(message.id);
        if (!mc) return;
        mc.style.display = result && !showOriginal ? "none" : "";
        return () => { mc.style.display = ""; };
    }, [result, showOriginal]);

    // Hide the reply bar's encoded reference text and show the decoded version
    useEffect(() => {
        if (!referenceResult) return;

        const listItem = document.querySelector<HTMLElement>(
            `li[id*="${message.id}"], [data-list-item-id*="${message.id}"]`
        );
        if (!listItem) return;

        const replyContent = listItem.querySelector<HTMLElement>(
            "[class*='repliedMessage'] [class*='messageContent']"
        );
        if (!replyContent || !replyContent.parentElement) return;

        replyContent.style.display = "none";
        const decoded = document.createElement("span");
        decoded.textContent = referenceResult.text;
        replyContent.parentElement.insertBefore(decoded, replyContent);

        return () => {
            replyContent.style.display = "";
            decoded.remove();
        };
    }, [referenceResult]);

    // Match decoded text color to the actual message content color
    useEffect(() => {
        if (!result || !containerRef.current) return;
        const mc = findMessageContentEl(message.id);
        if (!mc) return;
        const color = window.getComputedStyle(mc).color;
        containerRef.current.style.color = color;
        return () => { if (containerRef.current) containerRef.current.style.color = ""; };
    }, [result]);

    if (!result) return null;

    return (
        <span ref={containerRef} className={cl("accessory")}>
            <BaseConverterIcon width={16} height={16} className={cl("accessory-icon")} />
            <span className={cl("decoded-text")}>{Parser.parse(result.text)}</span>
            <br />
            <span className={cl("meta")}>
                <span className={cl("encoding-label")}>{result.encoding}</span>
                {" — "}
                <button className={cl("toggle-original")} onClick={() => setShowOriginal(v => !v)}>
                    {showOriginal ? "Hide original" : "Show original"}
                </button>
                {" — "}
                <button className={cl("dismiss")} onClick={() => { setResult(undefined); setShowOriginal(false); }}>
                    Dismiss
                </button>
            </span>
        </span>
    );
}
