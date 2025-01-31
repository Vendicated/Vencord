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

import { Constants, Clipboard, FluxDispatcher, Menu, React, RestAPI, Toasts } from "@webpack/common";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Promisable } from "type-fest";

const StickersStore = findStoreLazy("StickersStore");

interface Sticker {
    t: "Sticker";
    description: string;
    format_type: number;
    guild_id: string;
    id: string;
    name: string;
    tags: string;
    type: number;
}

type Data = Sticker;

const StickerExt = [, "png", "png", "json", "gif"] as const;

function getUrl(data: Data) {
    if (data.t === "Sticker")
        return `https:${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${data.id}.${StickerExt[data.format_type]}?size=2048&lossless=true`;

    return "";
}

async function fetchSticker(id: string) {
    const cached = StickersStore.getStickerById(id);
    if (cached) return cached;

    const { body } = await RestAPI.get({
        url: Constants.Endpoints.STICKER(id)
    });

    FluxDispatcher.dispatch({
        type: "STICKER_FETCH_SUCCESS",
        sticker: body
    });

    return body as Sticker;
}

function buildMenuItem(type: "Sticker", fetchData: () => Promisable<Omit<Sticker, "t">>) {
    return (
        <>
            <Menu.MenuSeparator></Menu.MenuSeparator>

            <Menu.MenuItem
                id="copystickerurl"
                key="copystickerurl"
                label={"Copy URL"}
                action={async () => {
                    const res = await fetchData();
                    const data = { t: type, ...res } as Sticker;
                    const url = getUrl(data);
                    Toasts.show({
                        message: "Link to sticker copied!",
                        type: Toasts.Type.SUCCESS,
                        id: Toasts.genId()
                    });
                    Clipboard.copy(url);
                }
                }
            />

            <Menu.MenuItem
                id="openstickerlink"
                key="openstickerlink"
                label={"Open URL"}
                action={async () => {
                    const res = await fetchData();
                    const data = { t: type, ...res } as Sticker;
                    const url = getUrl(data);
                    VencordNative.native.openExternal(url);
                }
                }
            />
        </>
    );
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const { favoriteableId, favoriteableType } = props ?? {};
    if (!favoriteableId) return;
    const menuItem = (() => {
        switch (favoriteableType) {
            case "sticker":
                const sticker = props.message.stickerItems.find(s => s.id === favoriteableId);
                if (sticker?.format_type === 3) return;

                return buildMenuItem("Sticker", () => fetchSticker(favoriteableId));
        }
    })();

    if (menuItem)
        findGroupChildrenByChildId("devmode-copy-id", children, true)?.push(menuItem);
};

const expressionPickerPatch: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => {
    const { id, type } = props?.target?.dataset ?? {};
    if (!id) return;

    if (type === "sticker" && !props.target.className?.includes("lottieCanvas")) {
        children.push(buildMenuItem("Sticker", () => fetchSticker(id)));
    }
};

export default definePlugin({
    name: "CopyStickerLinks",
    description: "Adds the ability to copy and open sticker links to your browser.",
    authors: [Devs.Byeoon],
    contextMenus: {
        "message": messageContextMenuPatch,
        "expression-picker": expressionPickerPatch
    }
});
