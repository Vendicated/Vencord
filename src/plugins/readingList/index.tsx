/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { Message, MessageAttachment } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, ChannelStore, Menu, NavigationRouter, Popout, React, ScrollerThin, Text, Timestamp, Tooltip, useEffect, useRef, UserStore, useState } from "@webpack/common";

const DATA_KEY = "ReadingList_ITEMS";
const UNREAD_KEY = "ReadingList_UNREAD";

// Get Discord's popout container classes for consistent styling
const PopoutClasses = findByPropsLazy("container", "scroller", "list");
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

interface StoredAttachment {
    id: string;
    filename: string;
    url: string;
    content_type?: string;
    size?: number;
}

interface ReadingListItem {
    id: string;
    messageId: string;
    channelId: string;
    guildId?: string;
    content: string;
    authorName: string;
    authorAvatar: string;
    timestamp: string;
    addedAt: number;
    note?: string;
    attachments?: StoredAttachment[];
}

const BookmarkIcon: IconComponent = ({ height = 24, width = 24, className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        height={height}
        width={width}
        className={className}
    >
        <path d="M17.5 2H6.5C5.12 2 4 3.12 4 4.5v17l8-4 8 4v-17c0-1.38-1.12-2.5-2.5-2.5zm0 16.5l-5.5-2.75L6.5 18.5V4.5h11v14z" />
    </svg>
);

const BookmarkFilledIcon: IconComponent = ({ height = 24, width = 24, className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        height={height}
        width={width}
        className={className}
    >
        <path d="M17.5 2H6.5C5.12 2 4 3.12 4 4.5v17l8-4 8 4v-17c0-1.38-1.12-2.5-2.5-2.5z" />
    </svg>
);

const TrashIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        height={height}
        width={width}
        className={className}
    >
        <path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z" />
        <path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z" />
    </svg>
);

const JumpIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        height={height}
        width={width}
        className={className}
    >
        <path d="M10 5V3H5.375C4.06519 3 3 4.06519 3 5.375V18.625C3 19.936 4.06519 21 5.375 21H18.625C19.936 21 21 19.936 21 18.625V14H19V19H5V5H10Z" />
        <path d="M21 2.99902H14V4.99902H17.586L9.29297 13.292L10.707 14.706L19 6.41302V9.99902H21V2.99902Z" />
    </svg>
);

const AttachmentIcon: IconComponent = ({ height = 16, width = 16, className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        height={height}
        width={width}
        className={className}
    >
        <path d="M6 2a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4V6a4 4 0 0 0-4-4H6zm10 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-4.6 6.8l-3.6 4.8a1 1 0 0 0 .8 1.6h10.8a1 1 0 0 0 .8-1.6l-2.4-3.2a1 1 0 0 0-1.6 0L14 17l-1.8-2.4a1 1 0 0 0-.8-.8z" />
    </svg>
);

let readingList: ReadingListItem[] = [];
let hasUnread = false;
const unreadListeners: Set<() => void> = new Set();

function notifyUnreadChange() {
    unreadListeners.forEach(listener => listener());
}

function useUnreadState() {
    const [, forceUpdate] = useState({});
    useEffect(() => {
        const listener = () => forceUpdate({});
        unreadListeners.add(listener);
        return () => { unreadListeners.delete(listener); };
    }, []);
    return hasUnread;
}

async function setUnread(value: boolean) {
    hasUnread = value;
    await DataStore.set(UNREAD_KEY, value);
    notifyUnreadChange();
}

async function loadReadingList(): Promise<ReadingListItem[]> {
    readingList = await DataStore.get(DATA_KEY) ?? [];
    return readingList;
}

async function saveReadingList(items: ReadingListItem[]): Promise<void> {
    readingList = items;
    await DataStore.set(DATA_KEY, items);
}

async function addToReadingList(msg: Message, note?: string): Promise<void> {
    const items = await loadReadingList();

    // Check if already exists
    if (items.some(item => item.messageId === msg.id)) {
        return;
    }

    const channel = ChannelStore.getChannel(msg.channel_id);

    // Store attachment info
    const attachments: StoredAttachment[] = (msg.attachments || []).map((a: MessageAttachment) => ({
        id: a.id,
        filename: a.filename,
        url: a.url,
        content_type: a.content_type,
        size: a.size
    }));

    const newItem: ReadingListItem = {
        id: `${msg.id}-${Date.now()}`,
        messageId: msg.id,
        channelId: msg.channel_id,
        guildId: channel?.guild_id,
        content: msg.content || "",
        authorName: msg.author.username,
        authorAvatar: msg.author.avatar
            ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${Number(msg.author.id) % 5}.png`,
        timestamp: msg.timestamp.toString(),
        addedAt: Date.now(),
        note,
        attachments: attachments.length > 0 ? attachments : undefined
    };

    items.unshift(newItem);
    await saveReadingList(items);
    await setUnread(true);
}

async function removeFromReadingList(id: string): Promise<void> {
    const items = await loadReadingList();
    const filtered = items.filter(item => item.id !== id);
    await saveReadingList(filtered);
}

function isInReadingList(messageId: string): boolean {
    return readingList.some(item => item.messageId === messageId);
}

function jumpToMessage(channelId: string, messageId: string, guildId?: string) {
    const path = guildId
        ? `/channels/${guildId}/${channelId}/${messageId}`
        : `/channels/@me/${channelId}/${messageId}`;
    NavigationRouter.transitionTo(path);
}

// Parse mentions and convert <@123456> to @username
function renderContent(content: string): React.ReactNode {
    if (!content) return null;

    // Pattern for user mentions: <@123456> or <@!123456>
    const mentionRegex = /<@!?(\d+)>/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
        // Add text before the mention
        if (match.index > lastIndex) {
            parts.push(content.slice(lastIndex, match.index));
        }

        const userId = match[1];
        const user = UserStore.getUser(userId);
        const username = user ? `@${user.username}` : "@Unknown User";

        parts.push(
            <span key={match.index} className="vc-reading-list-mention">
                {username}
            </span>
        );

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
        parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
}

function ReadingListItemComponent({ item, onRemove, onClose }: { item: ReadingListItem; onRemove: () => void; onClose: () => void; }) {
    const truncatedContent = item.content.length > 150
        ? item.content.slice(0, 150) + "..."
        : item.content;

    const hasContent = item.content.length > 0;
    const hasAttachments = item.attachments && item.attachments.length > 0;

    return (
        <div className="vc-reading-list-popover-item">
            <div className="vc-reading-list-item-header">
                <img
                    className="vc-reading-list-avatar"
                    src={item.authorAvatar}
                    alt={item.authorName}
                />
                <div className="vc-reading-list-meta">
                    <Text variant="text-sm/semibold">{item.authorName}</Text>
                    <Text variant="text-xs/normal" className="vc-reading-list-timestamp">
                        <Timestamp timestamp={new Date(item.timestamp)} />
                    </Text>
                </div>
                <div className="vc-reading-list-actions">
                    <Tooltip text="Jump to message">
                        {({ onMouseEnter, onMouseLeave }) => (
                            <button
                                className="vc-reading-list-action-btn"
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                onClick={() => {
                                    jumpToMessage(item.channelId, item.messageId, item.guildId);
                                    onClose();
                                }}
                            >
                                <JumpIcon />
                            </button>
                        )}
                    </Tooltip>
                    <Tooltip text="Remove from list">
                        {({ onMouseEnter, onMouseLeave }) => (
                            <button
                                className="vc-reading-list-action-btn vc-reading-list-action-btn-danger"
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                onClick={onRemove}
                            >
                                <TrashIcon />
                            </button>
                        )}
                    </Tooltip>
                </div>
            </div>
            {hasContent && (
                <div className="vc-reading-list-content">
                    <Text variant="text-sm/normal">{renderContent(truncatedContent)}</Text>
                </div>
            )}
            {hasAttachments && (
                <div className="vc-reading-list-attachments">
                    {item.attachments!.map(att => (
                        <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="vc-reading-list-attachment"
                        >
                            {att.content_type?.startsWith("image/") ? (
                                <img
                                    src={att.url}
                                    alt={att.filename}
                                    className="vc-reading-list-attachment-image"
                                />
                            ) : (
                                <div className="vc-reading-list-attachment-file">
                                    <AttachmentIcon />
                                    <span className="vc-reading-list-attachment-name">{att.filename}</span>
                                </div>
                            )}
                        </a>
                    ))}
                </div>
            )}
            {!hasContent && !hasAttachments && (
                <Text variant="text-sm/normal" className="vc-reading-list-no-content">
                    [No content]
                </Text>
            )}
        </div>
    );
}

function ReadingListPopout({ onClose }: { onClose: () => void; }) {
    const [items, setItems] = useState<ReadingListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReadingList().then(list => {
            setItems(list);
            setLoading(false);
        });
    }, []);

    const handleRemove = async (id: string) => {
        await removeFromReadingList(id);
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleClearAll = async () => {
        await saveReadingList([]);
        setItems([]);
    };

    return (
        <div className={`vc-reading-list-popout ${PopoutClasses?.container ?? ""}`}>
            <div className="vc-reading-list-popout-header">
                <BookmarkFilledIcon height={18} width={18} className="vc-reading-list-header-icon" />
                <Text variant="heading-md/semibold">Reading List</Text>
                <Text variant="text-xs/normal" className="vc-reading-list-count-badge">
                    {items.length}
                </Text>
            </div>
            <ScrollerThin className="vc-reading-list-popout-content">
                <ErrorBoundary>
                    {loading ? (
                        <div className="vc-reading-list-loading">
                            <Text variant="text-md/normal">Loading...</Text>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="vc-reading-list-empty">
                            <BookmarkIcon height={40} width={40} />
                            <Text variant="text-md/normal">Your reading list is empty</Text>
                            <Text variant="text-xs/normal" className="vc-reading-list-empty-hint">
                                Right-click a message to save it for later
                            </Text>
                        </div>
                    ) : (
                        <div className="vc-reading-list-items">
                            {items.map(item => (
                                <ReadingListItemComponent
                                    key={item.id}
                                    item={item}
                                    onRemove={() => handleRemove(item.id)}
                                    onClose={onClose}
                                />
                            ))}
                        </div>
                    )}
                </ErrorBoundary>
            </ScrollerThin>
            {items.length > 0 && (
                <div className="vc-reading-list-popout-footer">
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.RED}
                        look={Button.Looks.LINK}
                        onClick={handleClearAll}
                    >
                        Clear All
                    </Button>
                </div>
            )}
        </div>
    );
}

function ReadingListPopoutButton({ buttonClass }: { buttonClass: string; }) {
    const buttonRef = useRef(null);
    const [show, setShow] = useState(false);
    const unread = useUnreadState();

    const handleOpen = async () => {
        setShow(v => !v);
        if (!show) {
            await setUnread(false);
        }
    };

    return (
        <Popout
            position="bottom"
            align="right"
            animation={Popout.Animation.NONE}
            shouldShow={show}
            onRequestClose={() => setShow(false)}
            targetElementRef={buttonRef}
            renderPopout={() => <ReadingListPopout onClose={() => setShow(false)} />}
        >
            {(_, { isShown }) => (
                <HeaderBarIcon
                    ref={buttonRef}
                    className={`vc-readinglist-btn ${buttonClass}`}
                    onClick={handleOpen}
                    tooltip={isShown ? null : "Reading List"}
                    icon={() => (
                        <div className="vc-readinglist-icon-wrapper">
                            <BookmarkFilledIcon height={24} width={24} className="vc-readinglist-icon" />
                            {unread && !isShown && <div className="vc-readinglist-unread-badge" />}
                        </div>
                    )}
                    selected={isShown}
                />
            )}
        </Popout>
    );
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }) => {
    if (!message) return;

    const alreadySaved = isInReadingList(message.id);

    children.splice(-1, 0,
        <Menu.MenuItem
            id="vc-add-to-reading-list"
            label={alreadySaved ? "Already in Reading List" : "Add to Reading List"}
            action={() => !alreadySaved && addToReadingList(message)}
            icon={alreadySaved ? BookmarkFilledIcon : BookmarkIcon}
            disabled={alreadySaved}
        />
    );
};

const settings = definePluginSettings({
    showPopoverButton: {
        type: OptionType.BOOLEAN,
        description: "Show bookmark button in message toolbar",
        default: true
    }
});

export default definePlugin({
    name: "ReadingList",
    description: "Save messages to read later. Access via right-click menu or the top bar button.",
    authors: [Devs.EhDaYaGhaly],

    settings,

    contextMenus: {
        "message": messageContextMenuPatch
    },

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(?<=trailing:.{0,50}children:\[)(?=.+?className:(\i))/,
                replace: "$self.ReadingListButton({className:$1}),"
            }
        }
    ],

    ReadingListButton({ className }: { className: string; }) {
        return (
            <ErrorBoundary noop>
                <ReadingListPopoutButton buttonClass={className} />
            </ErrorBoundary>
        );
    },

    messagePopoverButton: {
        icon: BookmarkIcon,
        render(msg) {
            const alreadySaved = isInReadingList(msg.id);
            return {
                label: alreadySaved ? "Already in Reading List" : "Add to Reading List",
                icon: alreadySaved ? BookmarkFilledIcon : BookmarkIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: alreadySaved ? undefined : () => addToReadingList(msg)
            };
        }
    },

    async start() {
        await loadReadingList();
        hasUnread = await DataStore.get(UNREAD_KEY) ?? false;
        notifyUnreadChange();
    }
});
