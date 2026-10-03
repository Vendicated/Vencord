/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DeleteIcon } from "@components/Icons";
import { ConfirmModal, ContextMenuApi, Menu, openModal, useState } from "@webpack/common";
import type { MouseEvent } from "react";

import { addGifToCategory, deleteCategory, getCategories, type Gif, type GifCategory, GifFormat, removeGifFromCategory } from "./data";
import { deleteCategorySubtitle, isGifMedia } from "./helpers";

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

    const format = /\.mp4(?:[?#]|$)/i.test(safeSrc) ? GifFormat.Video : GifFormat.Image;

    return { url, src: safeSrc, format, width, height };
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
                        action={
                            () => checked
                                ? removeGifFromCategory(category.id, gif.url)
                                : addGifToCategory(category.id, gif)
                        }
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

function GifPickerContextMenu({ gif }: { gif: Gif; }) {
    const categories = getCategories();

    const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
        () => new Set(categories.filter(c => c.gifs.some(g => g.url === gif.url)).map(c => c.id))
    );

    return (
        <Menu.Menu navId="vc-bgc-gif-picker" onClose={ContextMenuApi.closeContextMenu}>
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

function CategoryContextMenu({ category, onDeleted }: { category: GifCategory; onDeleted: () => void; }) {
    return (
        <Menu.Menu navId="vc-bgc-category" onClose={ContextMenuApi.closeContextMenu} aria-label="Category Options">
            <Menu.MenuItem
                id="vc-bgc-delete-category"
                color="danger"
                icon={DeleteIcon}
                label="Delete Category"
                leadingAccessory={{ type: "icon", icon: DeleteIcon }}
                action={() => openModal(props => (
                    <ConfirmModal
                        {...props}
                        title="Delete Category"
                        subtitle={deleteCategorySubtitle(category)}
                        confirmText="Delete"
                        cancelText="Cancel"
                        onConfirm={async () => {
                            await deleteCategory(category.id);
                            onDeleted();
                        }}
                    />
                ))}
            />
        </Menu.Menu>
    );
}

export function handleCategoryContextMenu(event: MouseEvent, categoryId: string, onDeleted: () => void) {
    const category = getCategories().find(c => c.id === categoryId);

    if (!category) {
        return;
    }

    ContextMenuApi.openContextMenu(event, () => (
        <CategoryContextMenu category={category} onDeleted={onDeleted} />
    ));
}

export function handleGifContextMenu(event: MouseEvent, gif: any) {
    const gifData: Gif = {
        url: gif.url || gif.src,
        src: gif.src,
        format: gif.format ?? GifFormat.Image,
        width: gif.width ?? 200,
        height: gif.height ?? 200,
    };

    ContextMenuApi.openContextMenu(event, () => (
        <GifPickerContextMenu gif={gifData} />
    ));
}
