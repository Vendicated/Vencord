/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { sendMessage } from "@utils/discord";
import type { Channel, Message } from "@vencord/discord-types";
import { DraftType, React, showToast, Toasts, UploadHandler, useMemo, useRef, useState } from "@webpack/common";

import { EmojiSuggestion, emojiToText, getEmojiCategories, recordRecentEmoji, searchEmoji } from "./emoji";

interface Props {
    channel: Channel;
    replyTo: Message;
    onSent(): void;
}

export default function ReplyBar({ channel, replyTo, onSent }: Props) {
    const [value, setValue] = useState("");
    const [suggestions, setSuggestions] = useState<EmojiSuggestion[]>([]);
    const [sending, setSending] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerQuery, setPickerQuery] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isGuildMessage = !!channel.guild_id;
    const categories = useMemo(() => getEmojiCategories(pickerQuery), [pickerQuery, pickerOpen]);

    function updateSuggestions(text: string, caret: number) {
        const upToCaret = text.slice(0, caret);
        const match = /(?:^|\s):([a-zA-Z0-9_+-]{2,})$/.exec(upToCaret);
        if (!match) {
            setSuggestions([]);
            return;
        }
        setSuggestions(searchEmoji(match[1]));
    }

    function insertAtCaret(text: string) {
        const el = textareaRef.current;
        const caret = el?.selectionStart ?? value.length;
        const newValue = value.slice(0, caret) + text + value.slice(caret);
        setValue(newValue);
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(caret + text.length, caret + text.length);
        });
    }

    function applySuggestion(e: EmojiSuggestion) {
        const el = textareaRef.current;
        const caret = el?.selectionStart ?? value.length;
        const upToCaret = value.slice(0, caret);
        const match = /(?:^|\s):([a-zA-Z0-9_+-]{2,})$/.exec(upToCaret);
        if (!match) return;

        const start = caret - match[1].length - 1;
        const inserted = emojiToText(e);
        const newValue = value.slice(0, start) + inserted + " " + value.slice(caret);
        setValue(newValue);
        setSuggestions([]);
        recordRecentEmoji(e);
        requestAnimationFrame(() => el?.focus());
    }

    function pickFromPopover(e: EmojiSuggestion) {
        insertAtCaret(emojiToText(e) + " ");
        recordRecentEmoji(e);
        setPickerOpen(false);
        setPickerQuery("");
    }

    async function handleSend() {
        const content = value.trim();
        if (!content || sending) return;

        setSending(true);
        try {
            await sendMessage(channel.id, { content }, false, isGuildMessage ? {
                messageReference: {
                    channel_id: replyTo.channel_id,
                    message_id: replyTo.id,
                    guild_id: (replyTo as any).guild_id
                } as any,
                allowedMentions: { parse: ["users", "roles", "everyone"], replied_user: true }
            } : {});
            setValue("");
            onSent();
        } catch {
            showToast("Failed to send reply", Toasts.Type.FAILURE);
        } finally {
            setSending(false);
        }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
        const files = Array.from(e.clipboardData?.files ?? []);
        if (!files.length) return;
        e.preventDefault();
        UploadHandler.promptToUpload(files, channel, DraftType.ChannelMessage);
    }

    return (
        <div className="vc-dmn-replybar" onClick={e => e.stopPropagation()}>
            {suggestions.length > 0 && (
                <div className="vc-dmn-emoji-suggestions">
                    {suggestions.map(s => (
                        <div
                            key={s.key}
                            className="vc-dmn-emoji-suggestion"
                            onMouseDown={e => { e.preventDefault(); applySuggestion(s); }}
                        >
                            {s.src ? <img src={s.src} alt={s.name} /> : <span className="vc-dmn-emoji-unicode">{s.unicode}</span>}
                            <span>:{s.name}:</span>
                        </div>
                    ))}
                </div>
            )}

            {pickerOpen && (
                <div className="vc-dmn-emoji-popover">
                    <div className="vc-dmn-emoji-popover-search-wrap">
                        <svg className="vc-dmn-emoji-popover-search-icon" width="14" height="14" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.32l5.39 5.38 1.42-1.41-5.39-5.39A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
                        </svg>
                        <input
                            autoFocus
                            className="vc-dmn-emoji-popover-search"
                            placeholder="Find the perfect emoji"
                            value={pickerQuery}
                            onChange={e => setPickerQuery(e.target.value)}
                        />
                    </div>
                    <div className="vc-dmn-emoji-popover-body">
                        {categories.length === 0 && (
                            <div className="vc-dmn-emoji-empty">No emoji found</div>
                        )}
                        {categories.map(cat => (
                            <div key={cat.label} className="vc-dmn-emoji-category">
                                <div className="vc-dmn-emoji-category-label">{cat.label}</div>
                                <div className="vc-dmn-emoji-grid">
                                    {cat.emojis.map(s => (
                                        <div
                                            key={s.key}
                                            className="vc-dmn-emoji-grid-item"
                                            title={s.name}
                                            onMouseDown={e => { e.preventDefault(); pickFromPopover(s); }}
                                        >
                                            {s.src ? <img src={s.src} alt={s.name} /> : s.unicode}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="vc-dmn-replyrow">
                <button
                    className={`vc-dmn-icon-btn${pickerOpen ? " vc-dmn-active" : ""}`}
                    onClick={() => setPickerOpen(o => !o)}
                    aria-label="Emoji"
                    type="button"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-3.5-9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 17.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5Z" />
                    </svg>
                </button>
                <textarea
                    ref={textareaRef}
                    className="vc-dmn-textarea"
                    placeholder={isGuildMessage ? `Reply to ${replyTo.author?.username ?? "message"}...` : `Message ${replyTo.author?.username ?? ""}...`}
                    rows={1}
                    value={value}
                    onPaste={handlePaste}
                    onFocus={() => setPickerOpen(false)}
                    onChange={e => {
                        setValue(e.target.value);
                        updateSuggestions(e.target.value, e.target.selectionStart ?? e.target.value.length);
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        } else if (e.key === "Escape") {
                            setSuggestions([]);
                        }
                    }}
                />
                <button
                    className="vc-dmn-send-btn"
                    disabled={!value.trim() || sending}
                    onClick={handleSend}
                    aria-label="Send"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
