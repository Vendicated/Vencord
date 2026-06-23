/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { handleGifContextMenu } from "./contextMenu";
import { getCategories, GifCategory } from "./data";

const FAVORITES_RESULT_TYPE = "Favorites";
const FALLBACK_PREVIEW = "https://media.giphy.com/media/1TOSaJsWtnhe0/giphy.gif";

export interface CategoryTile {
    type: string;
    name: string;
    src: string;
    format: number;
    vcCategoryId: string;
}

let activeCategory: { id: string; name: string; } | null = null;

// The live gif picker instance (captured via the renderHeaderContent patch)
// Needed to avoid a display lag of one selection when switching between categories as re-renders were not triggered
let pickerInstance: any = null;

// Last known full favourites list, so we can restore it when leaving a category.
let fullFavorites: any[] = [];

function categoryGifs(id: string): any[] {
    const category = getCategories().find(c => c.id === id);

    return category ? category.gifs : [];
}

function buildTile(category: GifCategory): CategoryTile {
    const first = category.gifs[0];

    return {
        type: "Category",
        name: category.name,
        src: first?.src || FALLBACK_PREVIEW,
        format: first?.format ?? 1,
        vcCategoryId: category.id,
    };
}

export const patches = [
    {
        // The category-grid component that renders the useless trending categories and the favourites tile
        find: "renderCategoryExtras",
        replacement: [
            {
                // Replace Discord's trending categories with users custom categories
                match: /(this\.memoizedData\(this\.state\.favoritesTile,)this\.props\.trendingCategories(,this\.props\.hideFavoritesTile\))/,
                replace: "$1$self.getCategoryTiles()$2"
            },
            {
                // Always render the card grid
                match: /(\{className:\i,trendingCategories:(\i)\}=this\.props;return )0===\2\.length\?/,
                replace: "$1false?"
            },
            {
                // Intercept card clicks so our custom tiles open as a filtered favourites view
                match: /onClick:\(\)=>(\i)\((\i)\.type,\2\.name\)/,
                replace: "onClick:()=>$self.onSelectTile($2,$1)"
            }
        ]
    },
    {
        // The gif picker component that owns the favourites list.
        find: "renderHeaderContent()",
        replacement: [
            {
                // Capture the live picker instance so we can drive its
                // favourites/resultType directly on category selection.
                match: /(renderHeaderContent\(\)\{)/,
                replace: "$1$self.setInstance(this);"
            },
            {
                // Show the active category name in place of "Favourites" when
                // viewing a custom category.
                match: /children:(\i\.intl\.string\(\i\.\i\.\i\))(?=\}\);case \i\.dD\.TRENDING_GIFS)/,
                replace: "children:$self.getHeadingLabel($1)"
            },
            {
                // Swap the favourites the grid renders to the active
                // category's gifs when one is selected.
                match: /(,suggestions:\i,favorites:)(\i),/,
                replace: "$1$self.getFavorites($2),"
            }
        ]
    }
];

export function getHeadingLabel(defaultLabel: string): string {
    return activeCategory?.name ?? defaultLabel;
}

export function setInstance(instance: any): void {
    pickerInstance = instance;

    const existing = document.getElementById("gif-picker-tab-panel");

    if (existing?.dataset.bgcCtx) {
        return;
    }

    requestAnimationFrame(() => {
        const root = document.getElementById("gif-picker-tab-panel");

        if (!root || root.dataset.bgcCtx) {
            return;
        }

        root.dataset.bgcCtx = "1";
        root.addEventListener("contextmenu", (e: Event) => {
            const mouseEvent = e as MouseEvent;

            // couldn't find a way to trigger the context menu without all this..
            // walk up the DOM to the nearest React-owned element, then walk the fiber tree
            let el: Element | null = mouseEvent.target as Element | null;

            while (el && el !== root) {
                const fiberKey = Object.keys(el).find(k => k.startsWith("__reactFiber"));

                if (fiberKey) {
                    let fiber: any = (el as any)[fiberKey];

                    for (let i = 0; i < 10; i++) {
                        const p = fiber?.memoizedProps;

                        // gif tiles: have .url; category tiles: have .type, no .url
                        if (p?.item?.url && !p?.item?.type) {
                            mouseEvent.preventDefault();
                            mouseEvent.stopPropagation();
                            handleGifContextMenu(mouseEvent as any, p.item);
                            return;
                        }

                        if (!fiber?.return) {
                            break;
                        }

                        fiber = fiber.return;
                    }
                    break;
                }

                el = el.parentElement;
            }
        }, true);
    });
}

export function getCategoryTiles(): CategoryTile[] {
    // We are on the landing grid, so no category is being viewed
    activeCategory = null;

    return getCategories().map(buildTile);
}

export function getFavorites(original: any[]): any[] {
    if (activeCategory == null) {
        fullFavorites = original;
        return original;
    }

    const category = getCategories().find(c => c.id === activeCategory!.id);
    return category ? category.gifs : original;
}

export function onSelectTile(item: CategoryTile, onSelectItem: (type: string, name: string) => void): void {
    if (item?.vcCategoryId != null) {
        activeCategory = { id: item.vcCategoryId, name: item.name };

        if (pickerInstance == null) {
            onSelectItem(FAVORITES_RESULT_TYPE, item.name);
        } else {
            // Update the prop the favourites grid reads and re-render the picker
            pickerInstance.props.favorites = categoryGifs(activeCategory.id);
            pickerInstance.setState({ resultType: FAVORITES_RESULT_TYPE });
        }

        return;
    }

    // Any non-custom tile (in this case only the default favourites) clears the filter and
    // restores the full favourites list
    activeCategory = null;

    if (pickerInstance != null) {
        pickerInstance.props.favorites = fullFavorites;
    }

    onSelectItem?.(item.type, item.name);
}
