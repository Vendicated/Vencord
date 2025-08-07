/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import definePlugin from "@utils/types";
import { Message, Sticker } from "@vencord/discord-types";
import { Menu, React, StickersStore } from "@webpack/common";

const StickerExt = [, "png", "png", "json", "gif"] as const;

type PartialSticker = Pick<Sticker, "id" | "format_type">;

function getUrl(data: PartialSticker): string {
    if (data.format_type === 4)
        return `https:${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${data.id}.gif?size=512&lossless=true`;

    return `https://${window.GLOBAL_ENV.CDN_HOST}/stickers/${data.id}.${StickerExt[data.format_type]}?size=512&lossless=true`;
}

function buildMenuItem(sticker: PartialSticker) {
    return (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="vc-copy-sticker-url"
                key="vc-copy-sticker-url"
                label="Copy URL"
                action={() => copyWithToast(getUrl(sticker), "Link copied!")}
            />

            <Menu.MenuItem
                id="vc-open-sticker-url"
                key="vc-open-sticker-url"
                label="Open URL"
                action={() => VencordNative.native.openExternal(getUrl(sticker))}
            />
        </Menu.MenuGroup>
    );
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (
    children,
    { favoriteableId, favoriteableType, message }: { favoriteableId: string; favoriteableType: string; message: Message; }
) => {
    if (!favoriteableId || favoriteableType !== "sticker") return;

    const sticker = message.stickerItems.find(s => s.id === favoriteableId);
    if (!sticker?.format_type) return;

    const container = findGroupChildrenByChildId("devmode-copy-id", children, true) || children;

    container.push(buildMenuItem(sticker));
};

const expressionPickerPatch: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => {
    const id = props?.target?.dataset?.id;
    if (!id) return;
    if (props.target.className?.includes("lottieCanvas")) return;

    const sticker = StickersStore.getStickerById(id);
    if (sticker) {
        children.push(buildMenuItem(sticker));
    }
};

export default definePlugin({
    name: "CopyStickerURLs",
    description: "Adds the ability to copy & open Sticker links",
    authors: [Devs.Ven, Devs.Byeoon],
    contextMenus: {
        "message": messageContextMenuPatch,
        "expression-picker": expressionPickerPatch
    }
});
