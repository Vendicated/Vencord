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

import { LazyComponent } from "@utils/react";
import { findByCode } from "@webpack";
import { Avatar, ChannelStore, ContextMenu, GuildStore, showToast, Text, UserStore } from "@webpack/common";
import { Channel } from "discord-types/general";

import { BasicChannelTabsProps, Bookmarks, ChannelTabsUtils, UseBookmark } from "../util";
import { QuestionIcon } from "./ChannelTab";
import { BookmarkContextMenu } from "./ContextMenus";

const { switchChannel, useBookmarks } = ChannelTabsUtils;
const cl = (name: string) => `vc-channeltabs-${name}`;

const Star = LazyComponent(() => findByCode("M21.924 8.61789C21.77 8.24489"));
const FolderIcon = LazyComponent(() => findByCode("M20 7H12L10.553 5.106C10.214"));

export function bookmarkName(channel: Channel) {
    if (!channel) return "Bookmark";
    if (channel.name) return `#${channel.name}`;
    // TODO: do group dm's without a name set actually not have a name or is it the particiapnts?
    if (channel.recipients) return UserStore.getUser(channel.recipients?.[0])?.username
        ?? "Unknown User";
    return "Bookmark";
}

function BookmarkIcon({ bookmark }: { bookmark: Bookmarks[number]; }) {
    if ("bookmarks" in bookmark) return <FolderIcon height={16} width={16} color={bookmark.iconColor} />;

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

    return <QuestionIcon height={16} width={16} />;
}

function Bookmark({ bookmarks, index, methods }: { bookmarks: Bookmarks, index: number, methods: UseBookmark[1]; }) {
    const bookmark = bookmarks[index];

    return <div
        className={cl("bookmark")}
        onClick={() => "bookmarks" in bookmark ? showToast("TODO") : switchChannel(bookmark)}
        onContextMenu={e => ContextMenu.open(e, () =>
            <BookmarkContextMenu index={index} bookmarks={bookmarks} methods={methods} />
        )}
    >
        <BookmarkIcon bookmark={bookmark} />
        <Text variant="text-sm/normal" className={cl("name-text")}>{bookmark.name}</Text>
    </div>;
}

export default function BookmarkContainer(props: BasicChannelTabsProps & { userId: string; }) {
    const { guildId, channelId, userId } = props;
    const channel = ChannelStore.getChannel(channelId);
    const [bookmarks, methods] = useBookmarks(userId);
    const isCurrentChannelBookmarked = bookmarks ? bookmarks.some(b =>
        // TODO: folders
        !("bookmarks" in b) && b.channelId === channelId
    ) : false;

    return <div className={cl("inner-container")}>
        <button className={cl("button")} onClick={() => isCurrentChannelBookmarked
            ? methods.deleteBookmark(
                bookmarks!.findIndex(b => !("bookmarks" in b) && b.channelId === channelId)
            )
            : methods.addBookmark({
                guildId,
                channelId,
                name: bookmarkName(channel)
            })}
        >
            <Star
                height={20}
                width={20}
                foreground={isCurrentChannelBookmarked ? cl("bookmark-star-checked") : cl("bookmark-star")}
            />
        </button>
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
    </div>;
}
