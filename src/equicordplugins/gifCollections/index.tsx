/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

import { addCollectionContextMenuPatch, buildGifPickerContextMenu } from "./components/contextMenus";
import { settings, SortingOptions } from "./settings";
import { Category, Collection, Gif, GifPickerInstance } from "./types";
import { cache_collections, refreshCacheCollection, updateGif } from "./utils/collectionManager";
import { getFormat } from "./utils/getFormat";
import { logger, stripPrefix } from "./utils/misc";
import { batchRefreshAttachmentUrls, isCdnUrlExpired } from "./utils/refreshUrl";

let GIF_COLLECTION_PREFIX: string;
let GIF_ITEM_PREFIX: string;
let refreshingUrls = false;
let oldTrendingCat: Category[] | null = null;

export default definePlugin({
    name: "GifCollections",
    description: "Allows you to create collections of gifs.",
    authors: [EquicordDevs.creations],
    settings,
    contextMenus: {
        "message": addCollectionContextMenuPatch,
    },

    patches: [
        {
            find: "renderCategoryExtras",
            replacement: [
                {
                    match: /(render\(\){)(.{1,50}getItemGrid)/,
                    replace: "$1;$self.insertCollections(this);$2",
                },
                {
                    match: /("span",\{className:\i\.\i,children:)(\i)/,
                    replace: "$1$self.hidePrefix($2),",
                },
            ],
        },
        {
            find: "renderEmptyFavorite",
            replacement: {
                match: /render\(\){.{1,500}onClick:this\.handleClick,/,
                replace: "$&onContextMenu: (e) => $self.collectionContextMenu(e, this),",
            },
        },
        {
            find: "renderHeaderContent()",
            replacement: {
                match: /(renderContent\(\){)(.{1,50}resultItems)/,
                replace: "$1$self.renderContent(this);$2",
            },
        },
        {
            find: "type:\"GIF_PICKER_QUERY\"",
            replacement: {
                match: /(function \i\(.{1,10}\){)(.{1,100}.GIFS_SEARCH,query:)/,
                replace: "$1if($self.shouldStopFetch(arguments[0])) return;$2",
            },
        },
    ],

    start() {
        refreshCacheCollection();
        GIF_COLLECTION_PREFIX = settings.store.collectionPrefix;
        GIF_ITEM_PREFIX = settings.store.itemPrefix;
    },

    sortedCollections(): Collection[] {
        const sorted = [...cache_collections];
        const sortType = settings.store.collectionsSortType;
        const sortOrder = settings.store.collectionsSortOrder === "asc" ? 1 : -1;

        return sorted.sort((a, b) => {
            switch (sortType) {
                case SortingOptions.NAME:
                    return a.name.localeCompare(b.name) * sortOrder;
                case SortingOptions.CREATION_DATE:
                    return ((a.createdAt ?? 0) - (b.createdAt ?? 0)) * sortOrder;
                case SortingOptions.MODIFIED_DATE:
                    return ((a.lastUpdated ?? 0) - (b.lastUpdated ?? 0)) * sortOrder;
                default:
                    return 0;
            }
        });
    },

    renderContent(instance: GifPickerInstance) {
        if (!instance.props.query.startsWith(GIF_COLLECTION_PREFIX)) return;

        const collection = cache_collections.find(c => c.name === instance.props.query);
        if (!collection) return;

        instance.props.resultItems = collection.gifs.map(g => ({
            id: g.id,
            format: getFormat(g.src),
            src: g.src,
            url: g.url,
            width: g.width,
            height: g.height,
        })).reverse();

        const expiredGifs = collection.gifs.filter(g => g.src && g.url && (isCdnUrlExpired(g.src) || isCdnUrlExpired(g.url)));
        if (expiredGifs.length === 0) return;

        const allUrls = [...new Set<string>(
            expiredGifs.flatMap(g => [g.src, g.url].filter((u): u is string => !!u && isCdnUrlExpired(u)))
        )];

        if (!refreshingUrls) this.refreshExpiredUrls(allUrls, expiredGifs, instance.props.query);
    },

    async refreshExpiredUrls(urls: string[], expiredGifs: Gif[], query: string) {
        refreshingUrls = true;
        try {
            const fullMap: Record<string, string> = {};
            for (let i = 0; i < urls.length; i += 50) {
                const result = await batchRefreshAttachmentUrls(urls.slice(i, i + 50));
                Object.assign(fullMap, result);
            }

            if (!Object.keys(fullMap).length) return;

            let anyUpdated = false;
            for (const gif of expiredGifs) {
                const newSrc = fullMap[gif.src] ?? gif.src;
                const newUrl = fullMap[gif.url] ?? gif.url;
                if (newSrc !== gif.src || newUrl !== gif.url) {
                    await updateGif(gif.id, { ...gif, src: newSrc, url: newUrl });
                    anyUpdated = true;
                }
            }

            if (!anyUpdated) return;

            FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY", query: "" });
            FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY", query });
        } finally {
            refreshingUrls = false;
        }
    },

    hidePrefix: stripPrefix,

    insertCollections(instance: GifPickerInstance) {
        try {
            if (instance.props.trendingCategories.length && instance.props.trendingCategories[0].type === "Trending") {
                oldTrendingCat = instance.props.trendingCategories;
            }
            if (settings.store.onlyShowCollections) {
                instance.props.trendingCategories = [...this.sortedCollections(), ...instance.props.favorites];
            } else if (oldTrendingCat != null) {
                instance.props.trendingCategories = [...this.sortedCollections(), ...oldTrendingCat];
            }
        } catch (err) {
            logger.error("Failed to insert collections", err);
        }
    },

    shouldStopFetch(query: string) {
        return query.startsWith(GIF_COLLECTION_PREFIX) && cache_collections.some(c => c.name === query);
    },

    collectionContextMenu(e: React.MouseEvent, instance: GifPickerInstance) {
        return buildGifPickerContextMenu(e, instance.props.item, GIF_COLLECTION_PREFIX, GIF_ITEM_PREFIX, instance);
    },
});
