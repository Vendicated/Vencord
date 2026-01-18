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

import "./style.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Button, ChannelStore, Menu, NavigationRouter, React, Text, Timestamp, Tooltip, useEffect, useState } from "@webpack/common";

const DATA_KEY = "ReadingList_ITEMS";

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
        fill="white"
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

let readingList: ReadingListItem[] = [];

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

    const newItem: ReadingListItem = {
        id: `${msg.id}-${Date.now()}`,
        messageId: msg.id,
        channelId: msg.channel_id,
        guildId: channel?.guild_id,
        content: msg.content || "[No text content]",
        authorName: msg.author.username,
        authorAvatar: msg.author.avatar
            ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${Number(msg.author.id) % 5}.png`,
        timestamp: msg.timestamp.toString(),
        addedAt: Date.now(),
        note
    };

    items.unshift(newItem);
    await saveReadingList(items);
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

function ReadingListItem({ item, onRemove }: { item: ReadingListItem; onRemove: () => void; }) {
    const truncatedContent = item.content.length > 200
        ? item.content.slice(0, 200) + "..."
        : item.content;

    return (
        <div className="vc-reading-list-item">
            <div className="vc-reading-list-item-header">
                <img
                    className="vc-reading-list-avatar"
                    src={item.authorAvatar}
                    alt={item.authorName}
                />
                <div className="vc-reading-list-meta">
                    <Text variant="text-md/semibold">{item.authorName}</Text>
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
                                onClick={() => jumpToMessage(item.channelId, item.messageId, item.guildId)}
                            >
                                <JumpIcon className="vc-readinglist-icon" />
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
                                <TrashIcon className="vc-readinglist-icon" />
                            </button>
                        )}
                    </Tooltip>
                </div>
            </div>
            <div className="vc-reading-list-content">
                <Text variant="text-sm/normal">{truncatedContent}</Text>
            </div>
            {item.note && (
                <div className="vc-reading-list-note">
                    <Text variant="text-xs/medium" className="vc-reading-list-note-label">Note:</Text>
                    <Text variant="text-xs/normal">{item.note}</Text>
                </div>
            )}
            <Text variant="text-xs/normal" className="vc-reading-list-added">
                Added {new Date(item.addedAt).toLocaleDateString()}
            </Text>
        </div>
    );
}

function ReadingListModal({ rootProps }: { rootProps: any; }) {
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
        <ModalRoot {...rootProps} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false}>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>
                    <BookmarkFilledIcon height={20} width={20} className="vc-reading-list-header-icon" />
                    Reading List
                </Text>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <ErrorBoundary>
                    {loading ? (
                        <div className="vc-reading-list-loading">
                            <Text variant="text-md/normal">Loading...</Text>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="vc-reading-list-empty">
                            <BookmarkIcon height={48} width={48} />
                            <Text variant="text-md/normal">Your reading list is empty</Text>
                            <Text variant="text-sm/normal" className="vc-reading-list-empty-hint">
                                Right-click on any message and select "Add to Reading List" to save it for later!
                            </Text>
                        </div>
                    ) : (
                        <div className="vc-reading-list-items">
                            {items.map(item => (
                                <ReadingListItem
                                    key={item.id}
                                    item={item}
                                    onRemove={() => handleRemove(item.id)}
                                />
                            ))}
                        </div>
                    )}
                </ErrorBoundary>
            </ModalContent>
            {items.length > 0 && (
                <ModalFooter>
                    <Button color={Button.Colors.RED} onClick={handleClearAll}>
                        Clear All
                    </Button>
                    <Text variant="text-sm/normal" className="vc-reading-list-count">
                        {items.length} item{items.length !== 1 ? "s" : ""} saved
                    </Text>
                </ModalFooter>
            )}
        </ModalRoot>
    );
}

function openReadingListModal() {
    openModal(props => <ReadingListModal rootProps={props} />);
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
    description: "Save messages to read later. Access via right-click menu or the toolbar button.",
    authors: [Devs.EhDaYaGhaly],

    settings,

    contextMenus: {
        "message": messageContextMenuPatch
    },

    toolboxActions: {
        "Open Reading List": openReadingListModal
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
    }
});
