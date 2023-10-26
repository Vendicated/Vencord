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

import { classes } from "@utils/misc";
import { closeModal, openModal } from "@utils/modal";
import { Avatar, ChannelStore, ContextMenu, FluxDispatcher, GuildStore, i18n, Menu, ReactDnd, ReadStateStore, Text, Tooltip, useEffect, useRef, UserStore } from "@webpack/common";

import { BasicChannelTabsProps, Bookmark, BookmarkFolder, BookmarkProps, channelTabsSettings as settings, ChannelTabsUtils } from "../util";
import { NotificationDot } from "./ChannelTab";
import { BookmarkContextMenu, EditModal, ReadStateUtils } from "./ContextMenus";

const { switchChannel, useBookmarks } = ChannelTabsUtils;
const cl = (name: string) => `vc-channeltabs-${name}`;

const Star = ({ foreground }) => <svg
    height={20}
    width={20}
    viewBox="0 0 24 24"
>
    <path className={foreground} d="M21.924 8.61789C21.77 8.24489 21.404 8.00089 21 8.00089H15.618L12.894 2.55389C12.555 1.87689 11.444 1.87689 11.105 2.55389L8.38199 8.00089H2.99999C2.59599 8.00089 2.22999 8.24489 2.07599 8.61789C1.92199 8.99089 2.00699 9.42289 2.29299 9.70789L6.87699 14.2919L5.03899 20.7269C4.92399 21.1299 5.07199 21.5619 5.40999 21.8089C5.74999 22.0569 6.20699 22.0659 6.55399 21.8329L12 18.2029L17.445 21.8329C17.613 21.9449 17.806 22.0009 18 22.0009C18.207 22.0009 18.414 21.9369 18.59 21.8089C18.928 21.5619 19.076 21.1299 18.961 20.7269L17.123 14.2919L21.707 9.70789C21.993 9.42289 22.078 8.99089 21.924 8.61789Z" />
</svg>;

const QuestionIcon = () => <svg
    height={16}
    width={16}
    viewBox="0 0 24 24"
>
    <path fill="var(--text-muted)" d="M12 2C6.486 2 2 6.487 2 12C2 17.515 6.486 22 12 22C17.514 22 22 17.515 22 12C22 6.487 17.514 2 12 2ZM12 18.25C11.31 18.25 10.75 17.691 10.75 17C10.75 16.31 11.31 15.75 12 15.75C12.69 15.75 13.25 16.31 13.25 17C13.25 17.691 12.69 18.25 12 18.25ZM13 13.875V15H11V12H12C13.104 12 14 11.103 14 10C14 8.896 13.104 8 12 8C10.896 8 10 8.896 10 10H8C8 7.795 9.795 6 12 6C14.205 6 16 7.795 16 10C16 11.861 14.723 13.429 13 13.875Z" />
</svg>;

function BookmarkIcon({ bookmark }: { bookmark: Bookmark | BookmarkFolder; }) {
    if ("bookmarks" in bookmark) return <svg
        height={16}
        width={16}
        viewBox="0 0 24 24"
    >
        {/* folder icon */}
        <path fill={bookmark.iconColor} d="M20 7H12L10.553 5.106C10.214 4.428 9.521 4 8.764 4H3C2.447 4 2 4.447 2 5V19C2 20.104 2.895 21 4 21H20C21.104 21 22 20.104 22 19V9C22 7.896 21.104 7 20 7Z" />
    </svg>;

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
        if (channel.recipients.length === 1) return <Avatar
            size="SIZE_16"
            src={UserStore.getUser(channel.recipients[0]).getAvatarURL(undefined, 128)}
        />;
        else return <img
            src={channel.icon
                ? `https://${window.GLOBAL_ENV.CDN_HOST}/channel-icons/${channel?.id}/${channel?.icon}.png`
                : "https://discord.com/assets/c6851bd0b03f1cca5a8c1e720ea6ea17.png" // Default Group Icon
            }
            className={cl("bookmark-icon")}
        />;
    }

    return <QuestionIcon />;
}

function BookmarkFolderOpenMenu(props: BookmarkProps) {
    const { bookmarks, index, methods } = props;
    const bookmark = bookmarks[index] as BookmarkFolder;
    const { bookmarkNotificationDot } = settings.use(["bookmarkNotificationDot"]);

    return <Menu.Menu
        navId="bookmark-folder-menu"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="Bookmark Folder Menu"
    >
        {bookmark.bookmarks.map((bkm, i) => <Menu.MenuItem
            key={`bookmark-folder-entry-${bkm.channelId}`}
            id={`bookmark-folder-entry-${bkm.channelId}`}
            label={
                <div style={{ display: "flex", alignItems: "center", "gap": "0.25rem" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {bkm.name}
                    </span>
                    {bookmarkNotificationDot && <NotificationDot channelIds={[bkm.channelId]} />}
                </div>
            }
            icon={() => <BookmarkIcon bookmark={bkm} />}
            showIconFirst={true}
            action={() => switchChannel(bkm)}

            children={[
                (bookmarkNotificationDot && <Menu.MenuGroup>
                    <Menu.MenuItem
                        key="mark-as-read"
                        id="mark-as-read"
                        label={i18n.Messages.MARK_AS_READ}
                        disabled={!ReadStateStore.hasUnread(bkm.channelId)}
                        action={() => ReadStateUtils.markAsRead(ChannelStore.getChannel(bkm.channelId))}
                    />
                </Menu.MenuGroup>),
                <Menu.MenuGroup>
                    <Menu.MenuItem
                        key="edit-bookmark"
                        id="edit-bookmark"
                        label="Edit Bookmark"
                        action={() => {
                            const key = openModal(modalProps =>
                                <EditModal
                                    modalProps={modalProps}
                                    bookmark={bkm}
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

                            methods.addBookmark(bkm);
                            methods.editBookmark(index, { bookmarks: newBookmarks });
                        }}
                    />
                </Menu.MenuGroup>]}
        />)}
    </Menu.Menu>;
}

function Bookmark(props: BookmarkProps) {
    const { bookmarks, index, methods } = props;
    const bookmark = bookmarks[index];
    const { bookmarkNotificationDot } = settings.use(["bookmarkNotificationDot"]);

    const { useDrag, useDrop } = ReactDnd;
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

    return <div
        className={classes(cl("bookmark"), cl("hoverable"))}
        ref={ref}
        onClick={e => "bookmarks" in bookmark
            ? ContextMenu.open(e, () => <BookmarkFolderOpenMenu {...props} />)
            : switchChannel(bookmark)
        }
        onContextMenu={e => ContextMenu.open(e, () =>
            <BookmarkContextMenu {...props} />
        )}
    >
        <BookmarkIcon bookmark={bookmark} />
        <Text variant="text-sm/normal" className={cl("name-text")}>{bookmark.name}</Text>
        {bookmarkNotificationDot && <NotificationDot channelIds={"bookmarks" in bookmark
            ? bookmark.bookmarks.map(b => b.channelId)
            : [bookmark.channelId]
        } />}
    </div>;
}

function HorizontallyScrolling({ children, className }: React.PropsWithChildren<{ className?: string; }>) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        ref.current!.addEventListener("wheel", e => {
            e.preventDefault();
            ref.current!.scrollLeft += e.deltaY;
        });
    }, []);

    return <div className={classes(cl("scroller"), className)} ref={ref}>
        {children}
    </div>;
}

export default function BookmarkContainer(props: BasicChannelTabsProps & { userId: string; }) {
    const { guildId, channelId, userId } = props;
    const [bookmarks, methods] = useBookmarks(userId);


    let isCurrentChannelBookmarked = false, currentChannelFolderIndex = -1;
    bookmarks?.forEach((bookmark, i) => {
        if ("bookmarks" in bookmark) {
            if (bookmark.bookmarks.some(b => b.channelId === channelId)) {
                isCurrentChannelBookmarked = true;
                currentChannelFolderIndex = i;
            }
        }
        else if (bookmark.channelId === channelId) isCurrentChannelBookmarked = true;
    });

    return <div className={cl("bookmark-container")}>
        <HorizontallyScrolling className={cl("bookmarks")}>
            {bookmarks
                ? bookmarks.length
                    ? bookmarks.map((_, i) =>
                        <Bookmark key={i} index={i} bookmarks={bookmarks} methods={methods} />
                    )
                    : <Text className={cl("bookmark-placeholder-text")} variant="text-xs/normal">
                        You have no bookmarks. You can add an open tab or hide this by right clicking it
                    </Text>
                : <Text className={cl("bookmark-placeholder-text")} variant="text-xs/normal">
                    Loading bookmarks...
                </Text>
            }
        </HorizontallyScrolling>

        <Tooltip text={isCurrentChannelBookmarked ? "Remove from Bookmarks" : "Add to Bookmarks"} position="left" >
            {p => <button className={cl("button")} {...p} onClick={() => isCurrentChannelBookmarked
                ? currentChannelFolderIndex === -1
                    ? methods.deleteBookmark(
                        bookmarks!.findIndex(b => !("bookmarks" in b) && b.channelId === channelId)
                    )
                    : methods.deleteBookmark(
                        (bookmarks![currentChannelFolderIndex] as BookmarkFolder).bookmarks
                            .findIndex(b => b.channelId === channelId),
                        currentChannelFolderIndex
                    )
                : methods.addBookmark({
                    guildId,
                    channelId
                })}
            >
                <Star
                    foreground={isCurrentChannelBookmarked ? cl("bookmark-star-checked") : cl("bookmark-star")}
                />
            </button>}
        </Tooltip>
    </div>;
}
