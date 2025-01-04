/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { getIntlMessage } from "@utils/discord";
import { classes } from "@utils/misc";
import { closeModal, openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { Avatar, ChannelStore, ContextMenuApi, FluxDispatcher, GuildStore, Menu, ReadStateStore, ReadStateUtils, Text, Tooltip, useDrag, useDrop, useEffect, useRef, UserStore } from "@webpack/common";

import { BasicChannelTabsProps, Bookmark, BookmarkFolder, BookmarkProps, CircleQuestionIcon, isBookmarkFolder, settings, switchChannel, useBookmarks } from "../util";
import { NotificationDot } from "./ChannelTab";
import { BookmarkContextMenu, EditModal } from "./ContextMenus";

const cl = classNameFactory("vc-channeltabs-");

const { StarIcon } = findByPropsLazy("StarIcon");

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

    const channel = ChannelStore.getChannel(bookmark.channelId);
    const guild = GuildStore.getGuild(bookmark.guildId);
    if (guild) return guild.icon
        ? <img
            src={`https://${window.GLOBAL_ENV.CDN_HOST}/icons/${guild?.id}/${guild?.icon}.png`}
            className={cl("bookmark-icon")}
        />
        : <div className={cl("bookmark-icon")}>
            <Text variant="text-xxs/semibold" tag="span">{guild.acronym}</Text>
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
            {bookmark.bookmarks.map((b, i) => <><Menu.MenuItem
                key={`bookmark-folder-entry-${b.channelId}`}
                id={`bookmark-folder-entry-${b.channelId}`}
                label={<div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem"
                }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {b.name}
                    </span>
                    {bookmarkNotificationDot && <NotificationDot channelIds={[b.channelId]} />}
                </div>}
                icon={() => <BookmarkIcon bookmark={b} />}
                showIconFirst={true}
                action={() => switchChannel(b)} /><span>
                    (
                    bookmarkNotificationDot && <Menu.MenuGroup>
                        <Menu.MenuItem
                            key="mark-as-read"
                            id="mark-as-read"
                            label={getIntlMessage("MARK_AS_READ")}
                            disabled={!ReadStateStore.hasUnread(b.channelId)}
                            action={() => ReadStateUtils.ackChannel(ChannelStore.getChannel(b.channelId))} />
                    </Menu.MenuGroup>
                    )
                </span><span>
                    <Menu.MenuGroup key="bookmarks">

                        <Menu.MenuItem
                            key="edit-bookmark"
                            id="edit-bookmark"
                            label="Edit Bookmark"
                            action={() => {
                                const key = openModal(modalProps => <EditModal
                                    modalProps={modalProps}
                                    modalKey={key}
                                    bookmark={b}
                                    onSave={name => {
                                        const newBookmarks = [...bookmark.bookmarks];
                                        newBookmarks[i].name = name;
                                        methods.editBookmark(index, { bookmarks: newBookmarks });
                                        closeModal(key);
                                    }} />
                                );
                            }} />
                        <Menu.MenuItem
                            key="delete-bookmark"
                            id="delete-bookmark"
                            label="Delete Bookmark"
                            action={() => {
                                methods.deleteBookmark(i, index);
                            }} />
                        <Menu.MenuItem
                            key="remove-bookmark-from-folder"
                            id="remove-bookmark-from-folder"
                            label="Remove Bookmark from Folder"
                            action={() => {
                                const newBookmarks = [...bookmark.bookmarks];
                                newBookmarks.splice(i, 1);

                                methods.addBookmark(b);
                                methods.editBookmark(index, { bookmarks: newBookmarks });
                            }} />
                    </Menu.MenuGroup>
                </span>
            </>)}
        </Menu.Menu >
    );
}

function Bookmark(props: BookmarkProps) {
    const { bookmarks, index, methods } = props;
    const bookmark = bookmarks[index];
    const { bookmarkNotificationDot } = settings.use(["bookmarkNotificationDot"]);

    const ref = useRef<HTMLDivElement>(null);

    const [, drag] = useDrag(() => ({
        type: "vc_Bookmark",
        item: () => {
            return { index };
        },
        collect: monitor => ({
            isDragging: !!monitor.isDragging()
        }),
    }));

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
    drag(drop(ref));

    return (
        <div
            className={cl("bookmark", "hoverable", { wider: settings.store.widerTabsAndBookmarks })}
            ref={ref}
            onClick={e => isBookmarkFolder(bookmark)
                ? ContextMenuApi.openContextMenu(e, () => <BookmarkFolderOpenMenu {...props} />)
                : switchChannel(bookmark)
            }
            onContextMenu={e => ContextMenuApi.openContextMenu(e, () =>
                <BookmarkContextMenu {...props} />
            )}
        >
            <BookmarkIcon bookmark={bookmark} />
            <Text variant="text-sm/normal" className={cl("name-text")}>
                {bookmark.name}
            </Text>
            {bookmarkNotificationDot && <NotificationDot channelIds={isBookmarkFolder(bookmark)
                ? bookmark.bookmarks.map(b => b.channelId)
                : [bookmark.channelId]
            } />}
        </div>
    );
}

function HorizontalScroller({ children, className }: React.PropsWithChildren<{ className?: string; }>) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        ref.current!.addEventListener("wheel", e => {
            e.preventDefault();
            ref.current!.scrollLeft += e.deltaY;
        });
    }, []);

    return (
        <div className={classes(cl("scroller"), className)} ref={ref}>
            {children}
        </div>
    );
}

export default function BookmarkContainer(props: BasicChannelTabsProps & { userId: string; }) {
    const { guildId, channelId, userId } = props;
    const [bookmarks, methods] = useBookmarks(userId);

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

    return (
        <div className={cl("bookmark-container")}>
            <HorizontalScroller className={cl("bookmarks")}>
                {!bookmarks && <Text className={cl("bookmark-placeholder-text")} variant="text-xs/normal">
                    Loading bookmarks...
                </Text>}
                {bookmarks && !bookmarks.length && <Text className={cl("bookmark-placeholder-text")} variant="text-xs/normal">
                    You have no bookmarks. You can add an open tab or hide this by right clicking it
                </Text>}
                {Array.isArray(bookmarks) && bookmarks.length > 0 &&
                    bookmarks.map((_, i) => (
                        <Bookmark key={i} index={i} bookmarks={bookmarks} methods={methods} />
                    ))
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
                        colorClass={isCurrentChannelBookmarked ? cl("bookmark-star-checked") : cl("bookmark-star")}
                    />
                </button>}
            </Tooltip>
        </div>
    );
}
