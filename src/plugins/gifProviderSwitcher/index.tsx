/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { identity } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, GIFPickerViewStore, LocaleStore, RestAPI, Select } from "@webpack/common";

import * as GiphyProvider from "./giphy";
import * as TenorProvider from "./tenor";

let cachedCategories: TrendingCategoriesData | null = null;

const settings = definePluginSettings({
    provider: {
        type: OptionType.SELECT,
        description: "The provider to use. You can also change this directly in the GIF picker",
        options: [
            { label: "Tenor", value: "tenor", default: true },
            { label: "Giphy", value: "giphy" },
            { label: "Klipy", value: "klipy" },
        ] as const,
        onChange: () => {
            cachedCategories = null;
            fetchCategories();
        }
    }
});

const providers = {
    tenor: TenorProvider,
    giphy: GiphyProvider
};

export interface DiscordGif {
    id: string;
    title: string;
    url: string;
    src: string;
    gif_src: string;
    width: number;
    height: number;
    preview: string;
}

export interface TrendingCategoriesData {
    trendingCategories: Record<"name" | "src", string>[];
    trendingGIFPreview: { src: string; };
}

async function fetchCategories() {
    if (!cachedCategories) {
        if (settings.store.provider === "klipy") {
            const res = await RestAPI.get({
                url: "/gifs/trending",
                query: {
                    locale: LocaleStore.locale,
                    media_format: GIFPickerViewStore.getSelectedFormat()
                },
            });
            cachedCategories = {
                trendingCategories: res.body.categories,
                trendingGIFPreview: res.body.gifs[0]
            };
        } else {
            cachedCategories = await providers[settings.store.provider!].getCategories();

            if (!cachedCategories) return;
        }
    }

    FluxDispatcher.dispatch({ type: "GIF_PICKER_TRENDING_FETCH_SUCCESS", ...cachedCategories });
}

migratePluginSettings("GifProviderSwitcher", "TenorGifSearch");
export default definePlugin({
    name: "GifProviderSwitcher",
    description: "Allows you to use Tenor or Giphy GIF search instead of Klipy",
    authors: [Devs.Lunascape, Devs.Ven],
    tags: ["Media", "Chat", "Emotes"],
    searchTerms: ["TenorGifSearch"],
    settings,

    patches: [
        {
            find: "renderHeaderContent()",
            replacement: [
                {
                    match: /(?<=return\(0,\i\.jsxs?\)\()(\i\.\i),{(?=query:\i.{0,100}?placeholder:)/,
                    replace: "$self.SearchWrapper,{Component:$1,"
                }
            ]
        },
        {
            find: '"GIF_PICKER_TRENDING_FETCH_SUCCESS",trendingCategories:',
            replacement: [
                {
                    match: /let \i=Date\.now\(\);\i\([^)]+\),\i\.\i\.get\(\{url:\i\.\i\.GIFS_SEARCH,query:\{q:(\i),/,
                    replace: "if($self.shouldReplace)return $self.handleSearchFetch($1);$&"
                },
                {
                    match: /""!==(\i)&&null!=\1&&\i\.\i\.get\(\{url:\i\.\i\.GIFS_SUGGEST,/,
                    replace: "if($self.shouldReplace)return $self.handleSuggestionsFetch($1);$&"
                },
                {
                    match: /\i\.\i\.get\(\{url:\i\.\i\.GIFS_TRENDING,/,
                    replace: "if($self.shouldReplace)return $self.handleTrendingFetch();$&"
                },
                {
                    match: /let \i=Date\.now\(\);\i\([^)]+\),\i\.\i\.get\(\{url:\i\.\i\.GIFS_TRENDING_GIFS,/,
                    replace: "if($self.shouldReplace)return $self.handleTrendingGifsFetch();$&"
                },
                {
                    match: /\i\.\i\.post\(\{url:\i\.\i\.GIFS_SELECT,body:\{id:(\i),q:(\i)\}/,
                    replace: "!$self.handleGifSelect($1,$2)&&$&"
                }
            ]
        },
        {
            find: '"IntegrationQueryStore"',
            replacement: {
                match: /(?<=search\((\i),(\i)\)\{)let \i=\i\.getResults\(\1,\2\)[,;]/,
                replace: "if($self.shouldReplace)return $self.tenorIntegrationSearch($1,$2);$&"
            }
        },
        // Add back tenor command
        {
            find: 'commandId:"-16"',
            replacement: {
                match: /commandId:"-16"}/,
                replace: '$&,TENOR:{type:"GIF",command:"tenor",title:"Tenor",commandId:"-9"}'
            }
        },
        {
            find: "#{intl::COMMAND_GIPHY_DESCRIPTION}",
            replacement: {
                match: /(\i)===\i\.\i\.GIF\.title/,
                replace: '$&||$1==="Tenor"'
            }
        }
    ],

    async start() {
        cachedCategories = await this.provider.getCategories() ?? cachedCategories;
    },

    get shouldReplace() {
        return settings.store.provider !== "klipy";
    },

    get provider() {
        if (settings.store.provider === "klipy")
            throw new Error("Provider should never be klipy here");

        return providers[settings.store.provider!];
    },

    SearchWrapper: ErrorBoundary.wrap(({ Component, placeholder, "aria-label": ariaLabel, ...restProps }) => {
        const { provider } = settings.use(["provider"]);

        if (provider !== "klipy") {
            const name = provider![0].toUpperCase() + provider!.slice(1);
            placeholder &&= placeholder.replace("Klipy", name);
            ariaLabel &&= ariaLabel.replace("Klipy", name);
        }

        return (
            <div className="vc-tenorGifSearch-wrapper">
                <Component placeholder={placeholder} aria-label={ariaLabel} {...restProps} />
                <Select
                    placeholder="Provider"
                    options={settings.def.provider.options}
                    isSelected={v => v === provider}
                    select={v => settings.store.provider = v}
                    serialize={identity}
                />
            </div>
        );
    }, { noop: true }),

    handleSearchFetch(query: string) {
        this.provider.search(query, 100)
            .then(items => {
                FluxDispatcher.dispatch(
                    items.length
                        ? { type: "GIF_PICKER_QUERY_SUCCESS", query, items }
                        : { type: "GIF_PICKER_QUERY_FAILURE", query }
                );
            })
            .catch(() => {
                FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY_FAILURE", query });
            });
    },

    async handleSuggestionsFetch(query: string) {
        if (!query) return;

        const items = await this.provider.searchSuggestions(query);

        FluxDispatcher.dispatch({ type: "GIF_PICKER_SUGGESTIONS_SUCCESS", query, items });
    },

    async handleTrendingFetch() {
        if (!cachedCategories) {
            cachedCategories = await this.provider.getCategories();

            if (!cachedCategories) return;
        }

        FluxDispatcher.dispatch({ type: "GIF_PICKER_TRENDING_FETCH_SUCCESS", ...cachedCategories });
    },

    handleGifSelect(id: string, query: string) {
        if (!this.shouldReplace) return false;

        this.provider.registerShare(id, query);

        return true;
    },

    handleTrendingGifsFetch() {
        this.provider.getTrending(50)
            .then(items => {
                FluxDispatcher.dispatch(
                    items.length
                        ? { type: "GIF_PICKER_QUERY_SUCCESS", items }
                        : { type: "GIF_PICKER_QUERY_FAILURE" }
                );
            })
            .catch(() => {
                FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY_FAILURE" });
            });
    },

    tenorIntegrationSearch(integration: string, query: string) {
        FluxDispatcher.dispatch({ type: "INTEGRATION_QUERY", integration, query });

        this.provider.search(query, 20)
            .then(results => {
                FluxDispatcher.dispatch(
                    results.length
                        ? { type: "INTEGRATION_QUERY_SUCCESS", integration, query, results }
                        : { type: "INTEGRATION_QUERY_FAILURE", integration, query }
                );
            })
            .catch(() => {
                FluxDispatcher.dispatch({ type: "INTEGRATION_QUERY_FAILURE", integration, query, results: [] });
            });
    }
});
