/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { BasicChannelTabsProps, Bookmark, BookmarkFolder, BookmarkProps, isBookmarkFolder, isTabSelected, navigateToBookmark, openedTabs, settings, switchChannel, useBookmarks } from "@equicordplugins/channelTabs/util";
import { CircleQuestionIcon, DiscoveryIcon, EnvelopeIcon, FriendsIcon, NitroIcon, QuestIcon, ShopIcon } from "@equicordplugins/channelTabs/util/icons";
import { classNameFactory } from "@utils/css";
import { getGuildAcronym, getIntlMessage } from "@utils/discord";
import { classes } from "@utils/misc";
import { closeModal, openModal } from "@utils/modal";
import { findComponentByCodeLazy } from "@webpack";
import { Avatar, ChannelStore, ContextMenuApi, FluxDispatcher, GuildStore, Menu, React, ReadStateStore, ReadStateUtils, SelectedChannelStore, SelectedGuildStore, Tooltip, useDrag, useDrop, useEffect, useRef, UserStore, useState } from "@webpack/common";

import { NotificationDot } from "./ChannelTab";
import { BookmarkContextMenu, EditModal } from "./ContextMenus";

const cl = classNameFactory("vc-channeltabs-");

const StarIcon = findComponentByCodeLazy(".73-2.25h6.12l1.9-5.83Z");

function LibraryIcon({ height = 16, width = 16 }: { height?: number; width?: number; }) {
    return (
        <svg
            viewBox="0 0 24 24"
            height={height}
            width={width}
            fill="none"
        >
            <path fill="currentColor" d="M3 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3zm2 1v16h10V4H5zm13-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-2V3zm0 2v12h1V5h-1z" />
        </svg>
    );
}

function FolderIcon({ fill }: { fill: string; }) {
    return (
        <path
            fill={fill}
            d="M20 7H12L10.553 5.106C10.214 4.428 9.521 4 8.764 4H3C2.447 4 2 4.447 2 5V19C2 20.104 2.895 21 4 21H20C21.104 21 22 20.104 22 19V9C22 7.896 21.104 7 20 7Z"
        />
    );
}

function BookmarkIcon({ bookmark }: { bookmark: Bookmark | BookmarkFolder; }) {
    if (isBookmarkFolder(bookmark)) return (
        <svg
            height={16}
            width={16}
            viewBox="0 0 24 24"
        >
            <FolderIcon fill={bookmark.iconColor} />
        </svg>
    );

    // Handle special synthetic pages
    const { channelId } = bookmark;
    if (channelId?.startsWith("__")) {
        const specialIconsMap: Record<string, React.ComponentType<any>> = {
            "__quests__": QuestIcon,
            "__message-requests__": EnvelopeIcon,
            "__friends__": FriendsIcon,
            "__shop__": ShopIcon,
            "__library__": () => <LibraryIcon height={16} width={16} />,
            "__discovery__": DiscoveryIcon,
            "__nitro__": NitroIcon
        };

        const IconComponent = specialIconsMap[channelId];
        if (IconComponent) {
            // LibraryIcon is a function that returns JSX, others are webpack components
            if (channelId === "__library__") {
                return <LibraryIcon height={16} width={16} />;
            }
            return <IconComponent height={16} width={16} />;
        }
    }

    const channel = ChannelStore.getChannel(bookmark.channelId);
    const guild = GuildStore.getGuild(bookmark.guildId);
    if (guild) return guild.icon
        ? <img
            src={`https://${window.GLOBAL_ENV.CDN_HOST}/icons/${guild?.id}/${guild?.icon}.png`}
            className={cl("bookmark-icon")}
        />
        : <div className={cl("bookmark-icon")}>
            <BaseText size="xxs" weight="semibold" tag="span">{getGuildAcronym(guild)}</BaseText>
        </div>;

    if (channel?.recipients?.length) {
        if (channel.recipients.length === 1) return (
            <Avatar
                size="SIZE_16"
                src={UserStore.getUser(channel.recipients[0]).getAvatarURL(undefined, 128)}
            />
        );
        else return (
            <img
                src={channel.icon
                    ? `https://${window.GLOBAL_ENV.CDN_HOST}/channel-icons/${channel?.id}/${channel?.icon}.png`
                    : "/assets/c6851bd0b03f1cca5a8c1e720ea6ea17.png" // Default Group Icon
                }
                className={cl("bookmark-icon")}
            />
        );
    }

    return (
        <CircleQuestionIcon height={16} width={16} />
    );
}

function BookmarkFolderOpenMenu(props: BookmarkProps) {
    const { bookmarks, index, methods } = props;
    const bookmark = bookmarks[index] as BookmarkFolder;
    const { bookmarkNotificationDot } = settings.use(["bookmarkNotificationDot"]);

    return (
        <Menu.Menu
            navId="bookmark-folder-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Bookmark Folder Menu"
        >
            {bookmark.bookmarks.map((b, i) => (
                <Menu.MenuItem
                    key={`bookmark-folder-entry-${b.channelId}`}
                    id={`bookmark-folder-entry-${b.channelId}`}
                    label={
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem"
                            }}>
                            <span
                                style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                }}>
                                {b.name}
                            </span>
                            {bookmarkNotificationDot && <NotificationDot channelIds={[b.channelId]} />}
                        </div>
                    }
                    icon={() => <BookmarkIcon bookmark={b} />}
                    showIconFirst={true}
                    action={() => switchChannel(b)}
                >
                    {bookmarkNotificationDot && (
                        <Menu.MenuGroup>
                            <Menu.MenuItem
                                key="mark-as-read"
                                id="mark-as-read"
                                label={getIntlMessage("MARK_AS_READ")}
                                disabled={!ReadStateStore.hasUnread(b.channelId)}
                                action={() => ReadStateUtils.ackChannel(ChannelStore.getChannel(b.channelId))}
                            />
                        </Menu.MenuGroup>
                    )}
                    <Menu.MenuGroup key="bookmarks">
                        <Menu.MenuItem
                            key="edit-bookmark"
                            id="edit-bookmark"
                            label="Edit Bookmark"
                            action={() => {
                                const key = openModal(modalProps =>
                                    <EditModal
                                        modalProps={modalProps}
                                        modalKey={key}
                                        bookmark={b}
                                        onSave={name => {
                                            const newBookmarks = [...bookmark.bookmarks];
                                            newBookmarks[i].name = name;
                                            methods.editBookmark(index, { bookmarks: newBookmarks });
                                            closeModal(key);
                                        }}
                                    />
                                );
                            }}
                        />
                        <Menu.MenuItem
                            key="delete-bookmark"
                            id="delete-bookmark"
                            label="Delete Bookmark"
                            action={() => {
                                methods.deleteBookmark(i, index);
                            }}
                        />
                        <Menu.MenuItem
                            key="remove-bookmark-from-folder"
                            id="remove-bookmark-from-folder"
                            label="Remove Bookmark from Folder"
                            action={() => {
                                const newBookmarks = [...bookmark.bookmarks];
                                newBookmarks.splice(i, 1);
                                methods.addBookmark(b);
                                methods.editBookmark(index, { bookmarks: newBookmarks });
                            }}
                        />
                    </Menu.MenuGroup>
                </Menu.MenuItem>
            ))}
        </Menu.Menu>
    );
}

function FolderBookmarkItem({ bookmark, folderIndex, bookmarkIndex, methods, isCurrentChannel }: {
    bookmark: Bookmark;
    folderIndex: number;
    bookmarkIndex: number;
    methods: any;
    isCurrentChannel?: boolean;
}) {
    const { bookmarkNotificationDot } = settings.use(["bookmarkNotificationDot"]);
    const ref = useRef<HTMLDivElement>(null);

    // drag implementation for folder items
    const [, drag] = useDrag(() => ({
        type: "vc_Bookmark",
        item: () => ({
            index: bookmarkIndex, // index within folder
            folderIndex: folderIndex, // the folder its in
            bookmark: bookmark,
            isFromFolder: true
        }),
        collect: monitor => ({
            isDragging: !!monitor.isDragging()
        }),
    }), [bookmark, folderIndex, bookmarkIndex]);

    // combine drag ref
    drag(ref);

    return (
        <div
            ref={ref}
            className={classes(
                cl("bookmark", "folder-item", "hoverable"),
                isCurrentChannel && cl("bookmark-active")
            )}
            onClick={() => navigateToBookmark(bookmark)}
            onContextMenu={e => {
                e.stopPropagation();
                ContextMenuApi.openContextMenu(e, () => (
                    <Menu.Menu
                        navId="folder-item-context"
                        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                    >
                        <Menu.MenuItem
                            key="edit-bookmark"
                            id="edit-bookmark"
                            label="Edit Bookmark"
                            action={() => {
                                const key = openModal(modalProps =>
                                    <EditModal
                                        modalProps={modalProps}
                                        modalKey={key}
                                        bookmark={bookmark}
                                        onSave={name => {
                                            const folder = methods.bookmarks[folderIndex] as BookmarkFolder;
                                            const newBookmarks = [...folder.bookmarks];
                                            newBookmarks[bookmarkIndex].name = name;
                                            methods.editBookmark(folderIndex, { bookmarks: newBookmarks });
                                            closeModal(key);
                                        }}
                                    />
                                );
                            }}
                        />
                        <Menu.MenuItem
                            key="delete-bookmark"
                            id="delete-bookmark"
                            label="Delete Bookmark"
                            action={() => methods.deleteBookmark(bookmarkIndex, folderIndex)}
                        />
                        <Menu.MenuItem
                            key="remove-from-folder"
                            id="remove-from-folder"
                            label="Remove from Folder"
                            action={() => {
                                methods.addBookmark(bookmark);
                                methods.deleteBookmark(bookmarkIndex, folderIndex);
                            }}
                        />
                        {bookmarkNotificationDot && ReadStateStore.hasUnread(bookmark.channelId) && (
                            <Menu.MenuItem
                                key="mark-as-read"
                                id="mark-as-read"
                                label={getIntlMessage("MARK_AS_READ")}
                                action={() => ReadStateUtils.ackChannel(ChannelStore.getChannel(bookmark.channelId))}
                            />
                        )}
                    </Menu.Menu>
                ));
            }}
        >
            <svg width="12" height="12" viewBox="0 0 24 24" style={{ marginRight: "0.25rem" }}>
                <path fill="currentColor" d="M10 17l5-5-5-5z" />
            </svg>
            <BookmarkIcon bookmark={bookmark} />
            <BaseText size="sm" className={cl("name-text")}>
                {bookmark.name}
            </BaseText>
            {bookmarkNotificationDot && <NotificationDot channelIds={[bookmark.channelId]} />}
        </div>
    );
}

function Bookmark(props: BookmarkProps & { isExpanded?: boolean; onToggleFolder?: () => void; isCurrentChannel?: boolean; }) {
    const { bookmarks, index, methods, isExpanded, onToggleFolder, isCurrentChannel } = props;
    const bookmark = bookmarks[index];
    const { bookmarkNotificationDot } = settings.use(["bookmarkNotificationDot"]);

    const ref = useRef<HTMLDivElement>(null);

    const [, drag] = useDrag(() => ({
        type: "vc_Bookmark",
        canDrag: () => !isBookmarkFolder(bookmark), // Don't allow dragging folders
        item: () => {
            // find current index dynamically instead of using stale closure
            const currentIndex = bookmarks.findIndex(b =>
                isBookmarkFolder(b) ?
                    (isBookmarkFolder(bookmark) && b.bookmarks === bookmark.bookmarks) :
                    (!isBookmarkFolder(bookmark) && b.channelId === bookmark.channelId && b.guildId === bookmark.guildId)
            );
            return {
                index: currentIndex !== -1 ? currentIndex : index,
                folderIndex: undefined, // not in a folder (bar)
                bookmark: bookmark, // include full bookmark data
                isFromFolder: false
            };
        },
        collect: monitor => ({
            isDragging: !!monitor.isDragging()
        }),
    }), [bookmarks, bookmark, index]);

    const [, drop] = useDrop(() => ({
        accept: "vc_Bookmark",
        hover: (item, monitor) => {
            if (!ref.current) return;

            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleX =
                (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientX = clientOffset.x - hoverBoundingRect.left;
            if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX
                || dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
                return;
            }

            methods.moveDraggedBookmarks(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    }), []);

    // separate drop zone for folders to accept tabs and bookmarks (prevents duplicates)
    const [{ isOver: isFolderDropTarget }, folderDrop] = useDrop(() => ({
        accept: ["vc_ChannelTab", "vc_Bookmark"],
        canDrop: () => isBookmarkFolder(bookmark),
        drop: (item: any, monitor) => {
            if (!isBookmarkFolder(bookmark)) return;

            const itemType = monitor.getItemType();

            // dropping a tab onto a folder
            if (itemType === "vc_ChannelTab") {
                methods.addBookmark({
                    guildId: item.guildId,
                    channelId: item.channelId
                }, index);
            }

            // dropping a bookmark onto a folder (reorganize)
            if (itemType === "vc_Bookmark") {
                const sourceBookmark = item.bookmark || bookmarks[item.index];

                // skip if source is a folder
                if (isBookmarkFolder(sourceBookmark)) return;

                // skip if already in this folder
                if (item.isFromFolder && item.folderIndex === index) return;

                // remove from original location
                if (item.isFromFolder) {
                    // coming from a folder
                    methods.deleteBookmark(item.index, item.folderIndex);
                } else {
                    // coming from bar level
                    methods.deleteBookmark(item.index);
                }

                // add to this folder
                methods.addBookmark(sourceBookmark, index);
            }
        },
        collect: monitor => ({
            isOver: monitor.isOver({ shallow: true }) && monitor.canDrop()
        })
    }), [bookmarks, index, methods]);

    // combine refs differently based on bookmark type
    if (isBookmarkFolder(bookmark)) {
        drag(folderDrop(drop(ref)));
    } else {
        drag(drop(ref));
    }

    return (
        <div
            className={classes(
                cl("bookmark", "hoverable", { wider: settings.store.widerTabsAndBookmarks }),
                isFolderDropTarget && cl("folder-drop-target"),
                isExpanded && cl("folder-expanded"),
                isCurrentChannel && cl("bookmark-active")
            )}
            ref={ref}
            onClick={e => {
                if (isBookmarkFolder(bookmark)) {
                    onToggleFolder?.();
                } else {
                    navigateToBookmark(bookmark);
                }
            }}
            onContextMenu={e => ContextMenuApi.openContextMenu(e, () =>
                <BookmarkContextMenu {...props} />
            )}
        >
            <BookmarkIcon bookmark={bookmark} />
            {isBookmarkFolder(bookmark) && (
                <svg width="12" height="12" viewBox="0 0 24 24" style={{ marginLeft: "0.25rem" }}>
                    <path
                        fill="currentColor"
                        d={isExpanded ? "M7 10l5 5 5-5z" : "M10 17l5-5-5-5z"}
                    />
                </svg>
            )}
            <BaseText size="sm" className={cl("name-text")}>
                {bookmark.name}
            </BaseText>
            {bookmarkNotificationDot && <NotificationDot channelIds={isBookmarkFolder(bookmark)
                ? bookmark.bookmarks.map(b => b.channelId)
                : [bookmark.channelId]
            } />}
        </div>
    );
}

export function HorizontalScroller({ children, className, customRef }: React.PropsWithChildren<{ className?: string; customRef?: (node: HTMLDivElement) => void; }>) {
    const internalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = internalRef.current;
        if (!element) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            element.scrollLeft += e.deltaX + e.deltaY;
        };

        element.addEventListener("wheel", handleWheel);
        return () => element.removeEventListener("wheel", handleWheel);
    }, []);

    // Combine refs
    const combinedRef = (node: HTMLDivElement) => {
        internalRef.current = node;
        if (customRef) customRef(node);
    };

    return (
        <div className={classes(cl("scroller"), className)} ref={combinedRef}>
            {children}
        </div>
    );
}

export default function BookmarkContainer(props: BasicChannelTabsProps & { userId: string; }) {
    const { guildId, channelId, userId } = props;
    const [bookmarks, methods] = useBookmarks(userId);
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

    // make setting reactive to changes
    const { bookmarksIndependentFromTabs } = settings.use(["bookmarksIndependentFromTabs"]);

    const currentChannelId = SelectedChannelStore.getChannelId();
    const currentGuildId = SelectedGuildStore.getGuildId() || "@me";

    // check if current channel matches the active tab
    const activeTab = openedTabs.find(tab => isTabSelected(tab.id));
    const channelMatchesActiveTab = activeTab &&
        activeTab.channelId === currentChannelId &&
        (activeTab.guildId || "@me") === currentGuildId;

    const toggleFolder = (folderIndex: number) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderIndex)) {
                next.delete(folderIndex);
            } else {
                next.add(folderIndex);
            }
            return next;
        });
    };

    let isCurrentChannelBookmarked = false, currentChannelFolderIndex = -1;
    bookmarks?.forEach((bookmark, i) => {
        if (isBookmarkFolder(bookmark)) {
            if (bookmark.bookmarks.some(b => b.channelId === channelId)) {
                isCurrentChannelBookmarked = true;
                currentChannelFolderIndex = i;
            }
        }
        else if (bookmark.channelId === channelId) isCurrentChannelBookmarked = true;
    });

    const [{ isOver }, dropRef] = useDrop(() => ({
        accept: ["vc_ChannelTab", "vc_Bookmark"],
        drop: (item: any, monitor) => {
            if (!bookmarks) return;

            // check if a nested drop zone (like a folder) already handled this
            if (monitor.didDrop()) {
                return;
            }

            const itemType = monitor.getItemType();

            // if dropping a tab, create bookmark
            if (itemType === "vc_ChannelTab") {
                methods.addBookmark({
                    guildId: item.guildId,
                    channelId: item.channelId
                });
            }
            // if dropping a bookmark, handle based on source
            else if (itemType === "vc_Bookmark") {
                if (item.isFromFolder && item.folderIndex !== undefined) {
                    // moving from folder to bar (aka root level)
                    const folder = bookmarks[item.folderIndex];
                    if (isBookmarkFolder(folder)) {
                        const sourceBookmark = item.bookmark || folder.bookmarks[item.index];
                        methods.deleteBookmark(item.index, item.folderIndex);
                        methods.addBookmark(sourceBookmark);
                    }
                }
                // if moving from bar to bar, that's just reordering (handled by hover logic)
            }
        },
        collect: monitor => ({
            isOver: monitor.isOver({ shallow: true })
        })
    }), [bookmarks, methods]);

    return (
        <div className={cl("bookmark-container")}>
            <HorizontalScroller className={classes(cl("bookmarks"), isOver && cl("bookmarks-drop-target"))} customRef={dropRef}>
                {!bookmarks && <BaseText className={cl("bookmark-placeholder-text")} size="xs">
                    Loading bookmarks...
                </BaseText>}
                {bookmarks && !bookmarks.length && <BaseText className={cl("bookmark-placeholder-text")} size="xs">
                    You have no bookmarks. You can add an open tab or hide this by right clicking it
                </BaseText>}
                {Array.isArray(bookmarks) && bookmarks.length > 0 &&
                    bookmarks.flatMap((bookmark, i) => {
                        const items = [
                            <Bookmark
                                key={i}
                                index={i}
                                bookmarks={bookmarks}
                                methods={methods}
                                isExpanded={expandedFolders.has(i)}
                                onToggleFolder={() => toggleFolder(i)}
                                isCurrentChannel={
                                    bookmarksIndependentFromTabs &&
                                    !channelMatchesActiveTab && (
                                        !isBookmarkFolder(bookmark) &&
                                        bookmark.channelId === currentChannelId &&
                                        (bookmark.guildId || "@me") === currentGuildId
                                    )
                                }
                            />
                        ];

                        // if folder is expanded, render its bookmarks
                        if (isBookmarkFolder(bookmark) && expandedFolders.has(i)) {
                            bookmark.bookmarks.forEach((childBookmark, childIndex) => {
                                items.push(
                                    <FolderBookmarkItem
                                        key={`${i}-${childIndex}`}
                                        bookmark={childBookmark}
                                        folderIndex={i}
                                        bookmarkIndex={childIndex}
                                        methods={methods}
                                        isCurrentChannel={
                                            bookmarksIndependentFromTabs &&
                                            !channelMatchesActiveTab && (
                                                childBookmark.channelId === currentChannelId &&
                                                (childBookmark.guildId || "@me") === currentGuildId
                                            )
                                        }
                                    />
                                );
                            });
                        }

                        return items;
                    })
                }
            </HorizontalScroller>

            <Tooltip text={isCurrentChannelBookmarked ? "Remove from Bookmarks" : "Add to Bookmarks"} position="left" >
                {p => <button className={cl("button")} {...p} onClick={() => {
                    if (isCurrentChannelBookmarked) {
                        if (currentChannelFolderIndex === -1)
                            methods.deleteBookmark(
                                bookmarks!.findIndex(b => !(isBookmarkFolder(b)) && b.channelId === channelId)
                            );

                        else methods.deleteBookmark(
                            (bookmarks![currentChannelFolderIndex] as BookmarkFolder).bookmarks
                                .findIndex(b => b.channelId === channelId),
                            currentChannelFolderIndex
                        );
                    }
                    else methods.addBookmark({
                        guildId,
                        channelId
                    });
                }}
                >
                    <StarIcon
                        height={20}
                        width={20}
                        colorClass={isCurrentChannelBookmarked ? cl("bookmark-star-checked") : cl("bookmark-star")} />
                </button>}
            </Tooltip>
        </div>
    );
}
