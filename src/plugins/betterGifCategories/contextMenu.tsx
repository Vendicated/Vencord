/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Menu } from "@webpack/common";

import { addGifToCategory, getCategories, type Gif, removeGifFromCategory } from "./data";
import { gifKey, isGifMedia } from "./helpers";

/**
 * Builds a {@link Gif} from the righ clicked message context
 */
function gifFromMessageProps(props: any): Gif | null {
    const url: string | undefined = props?.itemHref ?? props?.itemSrc;

    if (!url) {
        return null;
    }

    const safeSrc: string = props?.itemSafeSrc ?? props?.itemSrc ?? url;

    let width = 200, height = 200;

    try {
        const _url = new URL(safeSrc);
        width = parseInt(_url.searchParams.get("width") ?? "200") || 200;
        height = parseInt(_url.searchParams.get("height") ?? "200") || 200;
    } catch {
        // malformed URL — keep defaults
    }

    // format 2 = video (.mp4), format 1 = image (.gif / animated WebP)
    const format = /\.mp4(?:[?#]|$)/i.test(safeSrc) ? 2 : 1;

    return { url, src: safeSrc, format, width, height, order: 0 };
}

function buildCategorySubmenu(gif: Gif) {
    const categories = getCategories();
    const key = gifKey(gif);

    return (
        <Menu.MenuItem
            key="vc-bgc-categories"
            id="vc-bgc-categories"
            label="Add to Category"
        >
            {categories.length === 0 ? (
                <Menu.MenuItem
                    key="vc-bgc-empty"
                    id="vc-bgc-empty"
                    label="No categories yet"
                    disabled
                />
            ) : categories.map(category => {
                const checked = category.gifs.some(g => gifKey(g) === key);

                return (
                    <Menu.MenuCheckboxItem
                        key={category.id}
                        id={`vc-bgc-cat-${category.id}`}
                        label={category.name}
                        checked={checked}
                        action={() => checked
                            ? removeGifFromCategory(category.id, key)
                            : addGifToCategory(category.id, gif)}
                    />
                );
            })}
        </Menu.MenuItem>
    );
}

export const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!isGifMedia(props)) {
        return;
    }

    const gif = gifFromMessageProps(props);

    if (!gif) {
        return;
    }

    const group = findGroupChildrenByChildId("copy-link", children) ?? children;
    group.push(buildCategorySubmenu(gif));
};
