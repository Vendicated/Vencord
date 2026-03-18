/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { copyWithToast, openImageModal } from "@utils/discord";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Parser, useEffect, useRef, useState } from "@webpack/common";

const MarkupClasses = findCssClassesLazy("markup", "codeContainer");
const MessageClasses = findCssClassesLazy("messageContent", "markupRtl");

const enum ReferencedMessageState {
    LOADED = 0,
    NOT_LOADED = 1,
    DELETED = 2,
}

type ReferencedMessage =
    | { state: ReferencedMessageState.LOADED; message: Message; }
    | { state: ReferencedMessageState.NOT_LOADED | ReferencedMessageState.DELETED; };

interface ReplyProps {
    referencedMessage: ReferencedMessage;
    baseMessage: Message;
}

function ExpandedReplyBtn({ referencedMessage, baseMessage }: ReplyProps) {
    const [expanded, setExpanded] = useState(false);
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    if (referencedMessage.state !== ReferencedMessageState.LOADED) return null;

    const msg = referencedMessage.message;
    if (!msg.content && msg.attachments?.length === 0 && msg.embeds?.length === 0) return null;

    useEffect(() => {
        if (!expanded) return;

        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setExpanded(false);
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [expanded]);

    useEffect(() => {
        if (!expanded || !popupRef.current || !wrapperRef.current) return;

        const position = () => {
            const popup = popupRef.current;
            if (!popup || !wrapperRef.current) return;

            const replyBar = wrapperRef.current.closest("[class*='repliedMessage']");
            const replyRect = replyBar?.getBoundingClientRect();
            const btn = wrapperRef.current.getBoundingClientRect();

            const left = replyRect ? replyRect.left : btn.left - 40;
            const popupWidth = replyRect ? Math.min(replyRect.width, 500) : 480;

            popup.style.left = `${left}px`;
            popup.style.width = `${popupWidth}px`;

            const spaceAbove = btn.top - 10;
            const maxH = Math.min(320, spaceAbove - 10);
            popup.style.maxHeight = `${Math.max(maxH, 100)}px`;
            popup.style.bottom = `${window.innerHeight - btn.top + 4}px`;
            popup.style.top = "auto";
        };

        requestAnimationFrame(position);
    }, [expanded]);

    return (
        <span className="vc-expanded-reply-wrapper" ref={wrapperRef}>
            <button
                className="vc-expanded-reply-btn"
                onClick={e => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                }}
                aria-label={expanded ? "Collapse reply" : "Expand reply"}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" className={expanded ? "vc-expanded-reply-chevron-open" : "vc-expanded-reply-chevron"}>
                    <path fill="currentColor" d="M7 10l5 5 5-5z" />
                </svg>
            </button>
            {expanded && (
                <div className="vc-expanded-reply-content" ref={popupRef} onClick={e => e.stopPropagation()}>
                    <div className="vc-expanded-reply-header">
                        <img
                            className="vc-expanded-reply-avatar"
                            src={`https://cdn.discordapp.com/avatars/${(msg.author as any).id}/${(msg.author as any).avatar}.webp?size=32`}
                            alt=""
                        />
                        <span className="vc-expanded-reply-author">
                            @{(msg.author as any).username}
                        </span>
                        <button
                            className="vc-expanded-reply-copy"
                            onClick={() => copyWithToast(msg.content || "")}
                            aria-label="Copy message"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                            </svg>
                        </button>
                        <button
                            className="vc-expanded-reply-close"
                            onClick={() => setExpanded(false)}
                            aria-label="Close"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>
                    </div>
                    <div className="vc-expanded-reply-body">
                        {msg.content && (
                            <div className={classes(MarkupClasses.markup, MessageClasses.messageContent, "vc-expanded-reply-text")}>
                                {Parser.parse(msg.content, false, {
                                    channelId: baseMessage.channel_id,
                                    messageId: msg.id,
                                    allowLinks: true,
                                    allowHeading: true,
                                    allowList: true,
                                    allowEmojiLinks: true,
                                })}
                            </div>
                        )}
                        {msg.attachments?.map((att: any) => {
                            if (att.content_type?.startsWith("image/")) {
                                return (
                                    <img
                                        key={att.id}
                                        src={att.url}
                                        className="vc-expanded-reply-image"
                                        alt={att.filename}
                                        loading="lazy"
                                        onClick={() => openImageModal({
                                            url: att.url,
                                            width: att.width,
                                            height: att.height,
                                        })}
                                    />
                                );
                            }
                            if (att.content_type?.startsWith("video/")) {
                                return (
                                    <video
                                        key={att.id}
                                        src={att.url}
                                        className="vc-expanded-reply-video"
                                        controls
                                        preload="metadata"
                                    />
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            )}
        </span>
    );
}

export default definePlugin({
    name: "ExpandedReply",
    description: "Adds a button to expand replied message previews to show full content",
    authors: [{ name: "kira_kohler", id: 839217437383983184n }],

    patches: [
        {
            find: "#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}",
            replacement: {
                match: /\.onClickReply,.+?}\),(?=\i,\i,\i\])/,
                replace: "$&$self.ExpandedReplyBtn(arguments[0]),"
            }
        }
    ],

    ExpandedReplyBtn: ErrorBoundary.wrap(ExpandedReplyBtn, { noop: true }),
});
