/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ContextMenuApi, Menu, useState } from "@webpack/common";

import { addGifToCategory, getCategories, type Gif, removeGifFromCategory } from "./data";
import { isGifMedia } from "./helpers";

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

// FIXME: checkboxes don't update instantly
// they only reflect the new state after a rerender, like moving the cursor out of the element
function buildCategorySubmenu(gif: Gif) {
    const categories = getCategories();

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
                const checked = category.gifs.some(g => g.url === gif.url);

                return (
                    <Menu.MenuCheckboxItem
                        key={category.id}
                        id={`vc-bgc-cat-${category.id}`}
                        label={category.name}
                        checked={checked}
                        action={() => checked
                            ? removeGifFromCategory(category.id, gif.url)
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

function GifPickerContextMenu({ gif, onClose }: { gif: Gif; onClose: () => void; }) {
    const categories = getCategories();

    const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
        () => new Set(categories.filter(c => c.gifs.some(g => g.url === gif.url)).map(c => c.id))
    );

    return (
        <Menu.Menu navId="vc-bgc-gif-picker" onClose={onClose}>
            <Menu.MenuItem id="vc-bgc-categories" label="Add to Category" disabled={categories.length === 0}>
                {categories.length === 0
                    ? <Menu.MenuItem id="vc-bgc-empty" label="No categories yet" disabled />
                    : categories.map(category => {
                        const checked = checkedIds.has(category.id);

                        return (
                            <Menu.MenuCheckboxItem
                                key={category.id}
                                id={`vc-bgc-cat-${category.id}`}
                                label={category.name}
                                checked={checked}
                                action={() => {
                                    setCheckedIds(prev => {
                                        const next = new Set(prev);

                                        if (checked) {
                                            next.delete(category.id);
                                        } else {
                                            next.add(category.id);
                                        }

                                        return next;
                                    });

                                    if (checked) {
                                        removeGifFromCategory(category.id, gif.url);
                                    } else {
                                        addGifToCategory(category.id, gif);
                                    }
                                }}
                            />
                        );
                    })
                }
            </Menu.MenuItem>
        </Menu.Menu>
    );
}

export function handleGifContextMenu(event: React.MouseEvent, gif: any) {
    const gifData: Gif = {
        url: gif.url || gif.src,
        src: gif.src,
        format: gif.format ?? 1,
        width: gif.width ?? 200,
        height: gif.height ?? 200,
        order: gif.order ?? 0,
    };

    ContextMenuApi.openContextMenu(event, ({ onClose }) => (
        <GifPickerContextMenu gif={gifData} onClose={onClose} />
    ));
}
