/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import { Parser, useEffect, useState } from "@webpack/common";

import { TranslateIcon } from "./TranslateIcon";
import { cl, TranslationValue } from "./utils";
import { settings } from "./settings";

const TranslationSetters = new Map<string, (v: TranslationValue | undefined) => void>();
const TranslatedMessages = new Map<string, TranslationValue>();
const TranslationListeners = new Map<string, Set<(v: TranslationValue | undefined) => void>>();

export function handleTranslate(messageId: string, data: TranslationValue | undefined) {
    if (data) {
        TranslatedMessages.set(messageId, data);
    } else {
        TranslatedMessages.delete(messageId);
    }

    // Update the message itself
    TranslationSetters.get(messageId)?.(data);

    // Update any replies referencing this message
    TranslationListeners.get(messageId)?.forEach(listener => listener(data));
}

function Dismiss({ onDismiss }: { onDismiss: () => void; }) {
    return (
        <button
            onClick={onDismiss}
            className={cl("dismiss")}
        >
            Dismiss
        </button>
    );
}

/**
 * Finds the DOM container of a Discord message by its ID.
 */
function findMessageContainer(channelId: string, messageId: string): Element | null {
    const byDiscordId = document.getElementById(`chat-messages-${channelId}-${messageId}`);
    if (byDiscordId) return byDiscordId;

    const byPartialId = document.querySelector(`[id$="-${messageId}"][id*="chat-messages"]`);
    if (byPartialId) return byPartialId;

    const byOurAttr = document.querySelector(`[data-vc-trans-msg-id="${messageId}"]`);
    if (byOurAttr) return byOurAttr.closest('li, [class*="message-"]');

    return null;
}

export function TranslationAccessory({ message }: { message: Message; }) {
    const channelId = message.channel_id;
    const displayMode = settings.store.displayMode;

    const [translation, setTranslation] = useState<TranslationValue | undefined>(
        TranslatedMessages.get(message.id)
    );

    const refMsgId = message.messageReference?.message_id;
    const [refTranslation, setRefTranslation] = useState<TranslationValue | undefined>(
        refMsgId ? TranslatedMessages.get(refMsgId) : undefined
    );

    // 1. Listen for translations of the current message
    useEffect(() => {
        if ((message as any).vencordEmbeddedBy) return;

        TranslationSetters.set(message.id, setTranslation);

        return () => {
            TranslationSetters.delete(message.id);
        };
    }, [message.id]);

    // 2. Listen for translations of the referenced message (reply reference)
    useEffect(() => {
        if (!refMsgId) return;

        const existing = TranslatedMessages.get(refMsgId);
        if (existing && !refTranslation) {
            setRefTranslation(existing);
        }

        const listener = (data: TranslationValue | undefined) => {
            setRefTranslation(data);
        };

        let listenersSet = TranslationListeners.get(refMsgId);
        if (!listenersSet) {
            listenersSet = new Set();
            TranslationListeners.set(refMsgId, listenersSet);
        }
        listenersSet.add(listener);

        return () => {
            listenersSet?.delete(listener);
            if (listenersSet?.size === 0) {
                TranslationListeners.delete(refMsgId);
            }
        };
    }, [refMsgId]);

    // 3. Toggle original message text visibility based on displayMode
    useEffect(() => {
        if (!message.id) return;

        const messageContainer = findMessageContainer(channelId, message.id);
        if (messageContainer) {
            const contentEls = messageContainer.querySelectorAll('[class*="messageContent"]');
            if (contentEls.length > 0) {
                const contentEl = contentEls[contentEls.length - 1] as HTMLElement;

                if (translation && displayMode === "translation") {
                    contentEl.style.display = "none";
                } else {
                    contentEl.style.display = "";
                }
            }
        }

        return () => {
            const mc = findMessageContainer(channelId, message.id);
            if (mc) {
                const contentEls = mc.querySelectorAll('[class*="messageContent"]');
                if (contentEls.length > 0) {
                    (contentEls[contentEls.length - 1] as HTMLElement).style.display = "";
                }
            }
        };
    }, [translation, displayMode, message.id, channelId]);

    // 4. Translate referenced reply preview in the DOM
    useEffect(() => {
        if (!refMsgId || !refTranslation) return;

        const messageContainer = findMessageContainer(channelId, message.id);
        if (!messageContainer) return;

        const replyContentEl = messageContainer.querySelector(
            '[class*="repliedTextContent"], [class*="repliedTextPreview"], [class*="repliedMessage"] [class*="markup"]'
        ) as HTMLElement | null;

        if (!replyContentEl) return;

        if (!replyContentEl.dataset.vcTransOriginalReply) {
            replyContentEl.dataset.vcTransOriginalReply = replyContentEl.textContent || "";
        }

        const truncated = refTranslation.text.length > 80
            ? refTranslation.text.slice(0, 80) + "…"
            : refTranslation.text;
        replyContentEl.textContent = truncated;
        replyContentEl.style.color = "var(--text-muted, #949ba4)";

        return () => {
            if (replyContentEl && replyContentEl.dataset.vcTransOriginalReply !== undefined) {
                replyContentEl.textContent = replyContentEl.dataset.vcTransOriginalReply;
                delete replyContentEl.dataset.vcTransOriginalReply;
                replyContentEl.style.color = "";
            }
        };
    }, [refTranslation, message.id, refMsgId, channelId]);

    if (!translation) return null;

    if (displayMode === "translation") {
        // In-Place translation mode
        return (
            <div
                data-vc-trans-msg-id={message.id}
                className={cl("inplace")}
                style={{ color: "var(--text-normal, #dbdee1)" }}
            >
                {Parser.parse(translation.text)}
                <br />
                <span style={{ fontSize: "0.8em" }}>
                    (<Dismiss onDismiss={() => handleTranslate(message.id, undefined)} />)
                </span>
            </div>
        );
    }

    // Both (Original and Translation) mode
    return (
        <span
            data-vc-trans-msg-id={message.id}
            className={cl("accessory")}
            style={{ color: "#e2e8f0" }}
        >
            <TranslateIcon width={16} height={16} className={cl("accessory-icon")} />
            {Parser.parse(translation.text)}
            <br />
            (translated from {translation.sourceLanguage} - <Dismiss onDismiss={() => handleTranslate(message.id, undefined)} />)
        </span>
    );
}
