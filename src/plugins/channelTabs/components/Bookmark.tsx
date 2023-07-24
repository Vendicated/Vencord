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

import { ContextMenu, Text } from "@webpack/common";

import { Bookmarks, ChannelTabsUtils, UseBookmark } from "../util.js";
import { BookmarkContextMenu } from "./ContextMenus.jsx";

const { switchChannel } = ChannelTabsUtils;
const cl = (name: string) => `vc-channeltabs-${name}`;

export default function Bookmark({ bookmark, methods }: { bookmark: Bookmarks[number], methods: UseBookmark[1]; }) {
    return <div
        className={cl("bookmark")}
        onClick={() => "bookmarks" in bookmark || switchChannel(bookmark)}
        onContextMenu={e => ContextMenu.open(e, () =>
            <BookmarkContextMenu bookmark={bookmark} methods={methods} />
        )}
    >
        <img height={16} width={16} src="https://cdn.discordapp.com/emojis/1024751291504791654.gif" />
        <Text variant="text-sm/normal" className={cl("name-text")}>{bookmark.name}</Text>
    </div>;
}
