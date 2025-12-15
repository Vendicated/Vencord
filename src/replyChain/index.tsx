/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import { closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Avatar, Button, MessageActions, MessageStore, Parser, Text, useStateFromStores, useState } from "@webpack/common";

const MESSAGES_PER_PAGE = 4;
const MAX_CONTENT_LENGTH = 120;

function ArrowDownIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="vc-better-replies-arrow"
        >
            <path
                d="M12 4v16m0 0l-6-6m6 6l6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function PaperclipIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 -3.34 50 49.68"
            fill="none"
            className="vc-better-replies-paperclip"
        >
            <path
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M36.025,19.506L20.202,35.329c-7.823,7.823-18.078-1.494-9.786-9.785c2.753-2.753,20.716-20.716,20.716-20.716c10.16-10.16,23.429,3.482,13.456,13.455c-3.363,3.364-20.716,20.715-20.716,20.715C10.519,52.351-6.795,35.974,7.025,22.154L22.849,6.331"
            />
        </svg>
    );
}

function StickerIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 50 50"
            fill="none"
            className="vc-better-replies-sticker-icon"
        >
            <polygon
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="bevel"
                points="28.061,3.865 43.794,5.456 45.385,21.189 18.868,47.706 1.544,30.382"
            />
            <circle
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="bevel"
                cx="34.248"
                cy="15.002"
                r="2.25"
            />
        </svg>
    );
}

function LinkIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 2050 2050"
            fill="none"
            className="vc-better-replies-link-icon"
        >
            <path
                fill="currentColor"
                d="M1321.3,1226.8a45,45,0,0,1-31.8-76.8l103.6-103.6a274.9,274.9,0,1,0-388.8-388.7L900.7,761.2a45,45,0,0,1-63.6-63.6L940.6,594a364.9,364.9,0,1,1,516.1,516.1l-103.5,103.5A44.9,44.9,0,0,1,1321.3,1226.8Z"
            />
            <path
                fill="currentColor"
                d="M849.7,1565.9A364.7,364.7,0,0,1,591.7,943L695.3,839.4A45,45,0,0,1,758.9,903L655.3,1006.6a274.9,274.9,0,0,0,388.8,388.8l103.6-103.6a45,45,0,0,1,63.6,63.7L1107.8,1459a363.8,363.8,0,0,1-258.1,106.9Z"
            />
            <path
                fill="currentColor"
                d="M781,1314.7a45,45,0,0,1-31.8-76.8l496.6-496.7a45,45,0,1,1,63.7,63.7L812.8,1301.6A45.1,45.1,0,0,1,781,1314.7Z"
            />
        </svg>
    );
}

const enum ReferencedMessageState {
    LOADED = 0,
    NOT_LOADED = 1,
    DELETED = 2,
}

interface ReferencedMessage {
    state: ReferencedMessageState;
    message?: Message;
}

interface ReplyProps {
    baseMessage: Message;
    referencedMessage: ReferencedMessage;
    channel: any;
}

const settings = definePluginSettings({
    maxMessages: {
        type: OptionType.SLIDER,
        description: "Maximum messages to load in reply chain (0 = Infinite)",
        default: 0,
        markers: [0, 25, 50, 100, 200],
        stickToMarkers: true,
    },
});

function jumpToMessage(channelId: string, messageId: string) {
    MessageActions.jumpToMessage({
        channelId,
        messageId,
        flash: true,
        jumpType: "INSTANT"
    });
}

function buildFullReplyChain(message: Message): Message[] {
    const chain: Message[] = [message];
    const maxMessages = settings.store.maxMessages;

    // Go UP the chain (find parents/ancestors)
    let current = message;
    while (current.messageReference) {
        if (maxMessages > 0 && chain.length >= maxMessages) break;
        const referenced = MessageStore.getMessage(
            current.messageReference.channel_id,
            current.messageReference.message_id
        );
        if (!referenced) break;
        chain.unshift(referenced);
        current = referenced;
    }

    // Go DOWN the chain (find children/replies to this message)
    // Get all messages in the channel and find ones that reply to messages in our chain
    const channelMessages = MessageStore.getMessages(message.channel_id);
    if (channelMessages?._array) {
        const chainIds = new Set(chain.map(m => m.id));
        let foundNew = true;

        while (foundNew) {
            if (maxMessages > 0 && chain.length >= maxMessages) break;
            foundNew = false;
            for (const msg of channelMessages._array) {
                if (maxMessages > 0 && chain.length >= maxMessages) break;
                if (chainIds.has(msg.id)) continue;
                if (msg.messageReference && chainIds.has(msg.messageReference.message_id)) {
                    chain.push(msg);
                    chainIds.add(msg.id);
                    foundNew = true;
                }
            }
        }
    }

    // Sort by timestamp to ensure correct order
    chain.sort((a, b) => {
        const timeA = typeof a.timestamp === "object" ? a.timestamp.valueOf() : new Date(a.timestamp).getTime();
        const timeB = typeof b.timestamp === "object" ? b.timestamp.valueOf() : new Date(b.timestamp).getTime();
        return timeA - timeB;
    });

    return chain;
}

function ReplyChainModal({ baseMessage, modalKey, transitionState }: { baseMessage: Message; modalKey: string; transitionState: any; }) {
    const [currentPage, setCurrentPage] = useState(0);

    const chain = useStateFromStores(
        [MessageStore],
        () => buildFullReplyChain(baseMessage),
        [baseMessage.id]
    );

    const totalPages = Math.ceil(chain.length / MESSAGES_PER_PAGE);
    const startIndex = currentPage * MESSAGES_PER_PAGE;
    const endIndex = startIndex + MESSAGES_PER_PAGE;
    const currentMessages = chain.slice(startIndex, endIndex);

    return (
        <ModalRoot size={ModalSize.MEDIUM} transitionState={transitionState}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Reply Chain</Text>
                <ModalCloseButton onClick={() => closeModal(modalKey)} />
            </ModalHeader>
            <ModalContent>
                <div className="vc-better-replies-modal-content">
                    {/* Pagination info */}
                    {totalPages > 1 && (
                        <div className="vc-better-replies-pagination-info">
                            Showing {startIndex + 1}-{Math.min(endIndex, chain.length)} of {chain.length} messages
                        </div>
                    )}

                    {currentMessages.map((msg, index) => {
                        const author = msg.author;
                        const authorName = author?.globalName || author?.username || "Unknown";
                        const globalIndex = startIndex + index;
                        const isFirst = globalIndex === 0;
                        const isNewest = globalIndex === chain.length - 1;
                        const isLastOnPage = index === currentMessages.length - 1;

                        const rawContent = msg.content || "";
                        const hasAttachments = msg.attachments?.length > 0;
                        const hasStickers = msg.stickerItems?.length > 0;
                        const hasEmbeds = msg.embeds?.length > 0;
                        const isTruncated = rawContent.length > MAX_CONTENT_LENGTH;
                        const displayContent = isTruncated ? rawContent.slice(0, MAX_CONTENT_LENGTH) + "..." : rawContent;

                        const renderTextContent = () => {
                            if (!rawContent) {
                                return <span className="vc-better-replies-no-content">[No content]</span>;
                            }

                            return (
                                <span>
                                    {Parser.parse(displayContent, true, { channelId: msg.channel_id, messageId: msg.id })}
                                </span>
                            );
                        };

                        const renderIndicators = () => {
                            const indicators: React.ReactNode[] = [];

                            if (hasAttachments) {
                                indicators.push(
                                    <span key="attachments" className="vc-better-replies-attachment-indicator">
                                        <PaperclipIcon /> {msg.attachments.length} attachment{msg.attachments.length > 1 ? "s" : ""}
                                    </span>
                                );
                            }

                            if (hasStickers) {
                                indicators.push(
                                    <span key="stickers" className="vc-better-replies-sticker-indicator">
                                        <StickerIcon /> {msg.stickerItems.length} sticker{msg.stickerItems.length > 1 ? "s" : ""}
                                    </span>
                                );
                            }

                            if (hasEmbeds) {
                                indicators.push(
                                    <span key="embeds" className="vc-better-replies-embed-indicator">
                                        <LinkIcon /> {msg.embeds.length} embed{msg.embeds.length > 1 ? "s" : ""}
                                    </span>
                                );
                            }

                            if (indicators.length === 0) return null;

                            return (
                                <div className="vc-better-replies-indicators">
                                    {indicators}
                                </div>
                            );
                        };

                        return (
                            <div key={msg.id}>
                                <div
                                    className={`vc-better-replies-modal-item ${isNewest ? "vc-better-replies-modal-current" : ""}`}
                                >
                                    {author && (
                                        <div
                                            className="vc-better-replies-avatar-wrapper"
                                            onClick={() => openUserProfile(author.id)}
                                        >
                                            <Avatar
                                                src={author.getAvatarURL(undefined, 40)}
                                                size="SIZE_40"
                                                className="vc-better-replies-modal-avatar"
                                            />
                                        </div>
                                    )}
                                    <div className="vc-better-replies-modal-body">
                                        <div className="vc-better-replies-modal-header">
                                            <span
                                                className="vc-better-replies-modal-author"
                                                onClick={() => author && openUserProfile(author.id)}
                                            >
                                                {authorName}
                                            </span>
                                            {isFirst && chain.length > 1 && (
                                                <span className="vc-better-replies-og-tag">Oldest</span>
                                            )}
                                            {isNewest && (
                                                <span className="vc-better-replies-current-tag">Newest</span>
                                            )}
                                        </div>
                                        <div className="vc-better-replies-modal-message">
                                            {renderTextContent()}
                                        </div>
                                    </div>
                                    {renderIndicators()}
                                    <div className="vc-better-replies-right-column">
                                        <Button
                                            size={Button.Sizes.SMALL}
                                            color={Button.Colors.BRAND}
                                            look={Button.Looks.FILLED}
                                            className="vc-better-replies-jump-btn"
                                            onClick={() => {
                                                closeModal(modalKey);
                                                jumpToMessage(msg.channel_id, msg.id);
                                            }}
                                        >
                                            Jump
                                        </Button>
                                    </div>
                                </div>
                                {!isLastOnPage && (
                                    <div className="vc-better-replies-modal-connector">
                                        <ArrowDownIcon />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Pagination controls */}
                    {totalPages > 1 && (
                        <div className="vc-better-replies-pagination">
                            <Button
                                size={Button.Sizes.SMALL}
                                color={Button.Colors.PRIMARY}
                                look={Button.Looks.LINK}
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                ← Previous
                            </Button>
                            <span className="vc-better-replies-page-indicator">
                                Page {currentPage + 1} of {totalPages}
                            </span>
                            <Button
                                size={Button.Sizes.SMALL}
                                color={Button.Colors.PRIMARY}
                                look={Button.Looks.LINK}
                                disabled={currentPage === totalPages - 1}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                Next →
                            </Button>
                        </div>
                    )}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

function openReplyChainModal(baseMessage: Message) {
    const key = openModal(props => (
        <ErrorBoundary>
            <ReplyChainModal baseMessage={baseMessage} modalKey={key} transitionState={props.transitionState} />
        </ErrorBoundary>
    ));
}

function ReplyChainButton({ baseMessage, referencedMessage }: ReplyProps) {
    if (referencedMessage.state !== ReferencedMessageState.LOADED || !referencedMessage.message) {
        return null;
    }

    const refMsg = referencedMessage.message;
    const hasNestedReply = refMsg.messageReference != null;

    if (!hasNestedReply) return null;

    return (
        <button
            className="vc-better-replies-chain-btn"
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                openReplyChainModal(baseMessage);
            }}
        >
            View Chain
        </button>
    );
}

export default definePlugin({
    name: "ReplyChain",
    description: "Adds a 'View Chain' button to replies that have nested reply chains, opening a modal to see the full conversation with jump buttons",
    authors: [{ name: "Zyhloh", id: 290965874318508042n }],
    settings,

    patches: [
        {
            find: "#{intl::REPLY_QUOTE_MESSAGE_BLOCKED}",
            replacement: {
                match: /\.onClickReply,.+?}\),(?=\i,\i,\i\])/,
                replace: "$&$self.renderChainButton(arguments[0]),"
            }
        }
    ],

    renderChainButton: ErrorBoundary.wrap((props: ReplyProps) => {
        return <ReplyChainButton {...props} />;
    }, { noop: true }),
});
