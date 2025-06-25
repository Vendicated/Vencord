/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import definePlugin from "@utils/types";
import { Menu, React, StickerStore } from "@webpack/common";
import { Promisable } from "type-fest";

interface Sticker {
    t: "Sticker";
    format_type: number;
    id: string;
    type: number;
}

const StickerExt = ["png", "png", "json", "gif"] as const;

function getUrl(data: Sticker) {
    if (data.format_type === 4)
        return `https:${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${data.id}.gif?size=4096&lossless=true`;

    return `https://${window.GLOBAL_ENV.CDN_HOST}/stickers/${data.id}.${StickerExt[data.format_type]}?size=4096&lossless=true`;
}

function buildMenuItem(Sticker, fetchData: () => Promisable<Omit<Sticker, "t">>) {
    return (
        <>
            <Menu.MenuSeparator></Menu.MenuSeparator>

            <Menu.MenuItem
                id="copystickerurl"
                key="copystickerurl"
                label={"Copy URL"}
                action={async () => {
                    const res = await fetchData();
                    const data = { t: Sticker, ...res } as Sticker;
                    const url = getUrl(data[0]);
                    copyWithToast(url, "Link copied!");
                }
                }
            />

            <Menu.MenuItem
                id="openstickerlink"
                key="openstickerlink"
                label={"Open URL"}
                action={async () => {
                    const res = await fetchData();
                    const data = { t: Sticker, ...res } as Sticker;
                    const url = getUrl(data[0]);
                    VencordNative.native.openExternal(url);
                }
                }
            />
        </>
    );
}

function buildMenuExpression(Sticker, fetchData: () => Promisable<Omit<Sticker, "t">>) {
    return (
        <>
            <Menu.MenuSeparator></Menu.MenuSeparator>
            <Menu.MenuItem
                id="copystickerurl"
                key="copystickerurl"
                label={"Copy URL"}
                action={async () => {
                    const res = await fetchData();
                    const data = { t: Sticker, ...res } as Sticker;
                    const url = getUrl(data);
                    copyWithToast(url, "Link copied!");
                }
                }
            />
            <Menu.MenuItem
                id="openstickerlink"
                key="openstickerlink"
                label={"Open URL"}
                action={async () => {
                    const res = await fetchData();
                    const data = { t: Sticker, ...res } as Sticker;
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
        const sticker = props.message.stickerItems.find(s => s.id === favoriteableId);
        if (sticker?.format_type === 3) return;
        switch (favoriteableType) {
            case "sticker":
                return buildMenuItem("Sticker", () => props.message.stickerItems);
        }
    })();

    if (menuItem)
        findGroupChildrenByChildId("devmode-copy-id", children, true)?.push(menuItem);
};

const expressionPickerPatch: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => {
    const { id } = props?.target?.dataset ?? {};
    if (!id) return;

    if (!props.target.className?.includes("lottieCanvas")) {
        const stickerCache = StickerStore.getStickerById(id);
        if (stickerCache) {
            children.push(buildMenuExpression("Sticker", () => stickerCache));
        }
    }
};

export default definePlugin({
    name: "CopyStickerLinks",
    description: "Adds the ability to copy and open sticker links to your browser",
    authors: [Devs.Byeoon],
    contextMenus: {
        "message": messageContextMenuPatch,
        "expression-picker": expressionPickerPatch
    }
});
