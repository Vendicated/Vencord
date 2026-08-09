/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { isNonNullish } from "@utils/guards";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, LocaleStore, Select } from "@webpack/common";

const cl = classNameFactory("vc-tenorgifsearch-");

// API key is taken from the GBoard app on iOS
const TENOR_KEY = "3Z0688EVWYKH";

let cachedCategories: TrendingCategories | null = null;

interface TenorMedia {
    url: string;
    preview: string;
    dims: [number, number];
}
interface TenorResult {
    id: string;
    media: Array<Record<string, TenorMedia>>;
    itemurl: string;
}
interface TenorCategoryTag {
    searchterm: string;
    image: string;
}

interface DiscordGif {
    id: string;
    title: string;
    url: string;
    src: string;
    gif_src: string;
    width: number;
    height: number;
    preview: string;
}

interface TrendingCategories {
    trendingCategories: Record<"name" | "src", string>[];
    trendingGIFPreview: { src: string; };
}

function toDiscordGif(item: TenorResult): DiscordGif | null {
    const { gif, webm } = item.media[0];

    return {
        id: item.id,
        title: "", // discord always returns a blank string
        url: item.itemurl,
        gif_src: gif.url,
        src: webm.url,
        width: webm.dims[0],
        height: webm.dims[1],
        preview: webm.preview
    };
}

function mapToDiscordGifs(items: TenorResult[]) {
    return items.map(toDiscordGif).filter(isNonNullish);
}

async function tenorFetch<TResult>(path: string, params: Record<string, string>) {
    const url = `https://api.tenor.com/v1${path}?` + new URLSearchParams({
        key: TENOR_KEY,
        locale: LocaleStore.locale.replace("-", "_").toLowerCase(),
        ...params
    });

    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`GET ${path}: Tenor API request failed with status ${res.status}`);

    return res.json() as Promise<TResult>;
}

// function contributed by taep96
async function fetchTenorResults(path: string, limit: number, extra: Record<string, string> = {}) {
    const pageSize = Math.min(limit, 50);
    const items: TenorResult[] = [];
    const seen = new Set<string>();
    let pos = "";

    while (items.length < limit) {
        const params: Record<string, string> = {
            ...extra,
            limit: String(Math.min(limit - items.length, pageSize))
        };
        if (pos) params.pos = pos;

        const { next, results: page } = await tenorFetch<{ next?: string; results: TenorResult[]; }>(path, params);
        if (!page.length) break;

        const previousLength = items.length;
        for (const item of page) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);

            items.push(item);
            if (items.length >= limit) break;
        }
        if (items.length === previousLength) break;

        if (!next || next === pos) break;
        pos = next;
    }

    return items;
}

async function fetchCategories(): Promise<TrendingCategories | null> {
    return tenorFetch<{ tags?: TenorCategoryTag[]; }>("/categories", { type: "featured" })
        .then(({ tags }) => {
            if (!tags?.length) return null;

            return {
                trendingCategories: tags.map(t => ({ name: t.searchterm, src: t.image })),
                trendingGIFPreview: { src: tags[0].image }
            };
        })
        .catch(() => null);

}

const settings = definePluginSettings({
    provider: {
        type: OptionType.SELECT,
        displayName: "Default Provider",
        description: "Which GIF provider to use",
        options: [
            { label: "Tenor", value: "tenor", default: true },
            { label: "Klipy (Discord's default)", value: "klipy" }
        ]
    }
});

const providerOptions = [
    { label: "Tenor", value: "tenor" },
    { label: "Klipy", value: "klipy" }
];

interface PickerInstance {
    forceUpdate(): void;
    handleClearQuery(): void;
    handleChangeQuery(query: string): void;
    props: { query: string; };
}

const REQUERY_MAX_WAIT_MS = 500;

// Polls until the picker's query has actually cleared, then calls onCleared().
function waitForQueryClear(instance: PickerInstance, onCleared: () => void) {
    const deadline = Date.now() + REQUERY_MAX_WAIT_MS;

    const check = () => {
        if (instance.props.query === "" || Date.now() >= deadline) {
            onCleared();
        } else {
            requestAnimationFrame(check);
        }
    };

    requestAnimationFrame(check);
}

function ProviderToggle({ instance }: { instance: PickerInstance; }) {
    const { provider } = settings.use(["provider"]);

    const onSelect = (v: string) => {
        if (v === settings.store.provider) return;
        settings.store.provider = v;

        // Reload the picker under the new provider.
        const { query } = instance.props;
        instance.handleClearQuery();
        if (query) {
            waitForQueryClear(instance, () => instance.handleChangeQuery(query));
        }
        instance.forceUpdate();
    };

    return (
        // Fixed-width clip; Discord's Select ignores plain width overrides.
        <div className={cl("provider-select-clip")}>
            <Select
                options={providerOptions}
                isSelected={v => v === provider}
                select={onSelect}
                serialize={v => v}
                closeOnSelect={true}
            />
        </div>
    );
}

export default definePlugin({
    name: "TenorGifSearch",
    description: "Restore Tenor GIF search",
    authors: [Devs.Lunascape],
    settings,

    patches: [
        {
            find: "renderHeaderContent()",
            replacement: [
                {
                    match: /placeholder:(\i),"aria-label":(\i)/,
                    replace: 'placeholder:$self.isTenor()?$1?.replace(/Giphy|Klipy/gi,"Tenor"):$1,"aria-label":$self.isTenor()?$2?.replace(/Giphy|Klipy/gi,"Tenor"):$2'
                },
                {
                    // Render the provider toggle to the left of the search bar / header content
                    match: /children:\[(\i),this\.renderHeaderContent\(\)\]/,
                    replace: "children:[$1,$self.renderProviderToggle(this),this.renderHeaderContent()]"
                }
            ]
        },
        {
            find: '"GIF_PICKER_TRENDING_FETCH_SUCCESS",trendingCategories:',
            replacement: [
                {
                    match: /let \i=Date\.now\(\);\i\([^)]+\),\i\.\i\.get\(\{url:\i\.\i\.GIFS_SEARCH,query:\{q:(\i),/,
                    replace: "if($self.isTenor())return $self.handleSearchFetch($1);$&"
                },
                {
                    match: /""!==(\i)&&null!=\1&&\i\.\i\.get\(\{url:\i\.\i\.GIFS_SUGGEST,/,
                    replace: "if($self.isTenor())return $self.handleSuggestionsFetch($1);$&"
                },
                {
                    match: /\i\.\i\.get\(\{url:\i\.\i\.GIFS_TRENDING,/,
                    replace: "if($self.isTenor())return $self.handleTrendingFetch();$&"
                },
                {
                    match: /let \i=Date\.now\(\);\i\([^)]+\),\i\.\i\.get\(\{url:\i\.\i\.GIFS_TRENDING_GIFS,/,
                    replace: "if($self.isTenor())return $self.handleTrendingGifsFetch();$&"
                },
                {
                    match: /\i\.\i\.post\(\{url:\i\.\i\.GIFS_SELECT,body:\{id:(\i),q:(\i)\}/,
                    replace: "($self.isTenor()?($self.handleGifSelect($1,$2),false):true)&&$&"
                }
            ]
        },
        {
            find: '"IntegrationQueryStore"',
            replacement: {
                match: /(?<=search\((\i),(\i)\)\{)null==(\i)\.getResults\(\1,\2\)&&/,
                replace: "if($self.isTenor())return $self.tenorIntegrationSearch($1,$2);null==$3.getResults($1,$2)&&"
            }
        },
        // Add back tenor command
        {
            find: 'commandId:"-16"',
            replacement: {
                match: /commandId:"-16"}/,
                replace: '$&,...($self.isTenor()?{TENOR:{type:"GIF",command:"tenor",title:"Tenor",commandId:"-9"}}:{})'
            }
        },
        {
            find: "#{intl::COMMAND_GIPHY_DESCRIPTION}",
            replacement: {
                match: /(\i)===\i\.\i\.GIF\.title/,
                replace: '$&||($self.isTenor()&&$1==="Tenor")'
            }
        }
    ],

    isTenor() {
        return settings.store.provider === "tenor";
    },

    renderProviderToggle(instance: PickerInstance) {
        return <ProviderToggle instance={instance} />;
    },

    async start() {
        cachedCategories = await fetchCategories() ?? cachedCategories;
    },

    handleSearchFetch(query: string) {
        // Discord has a 100 result limit for normal search
        fetchTenorResults("/search", 100, { q: query })
            .then(results => {
                const items = mapToDiscordGifs(results);
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

        const { results } = await tenorFetch<{ results?: string[]; }>("/search_suggestions", { q: query, limit: "5" });

        FluxDispatcher.dispatch({ type: "GIF_PICKER_SUGGESTIONS_SUCCESS", query, items: results });
    },

    async handleTrendingFetch() {
        if (!cachedCategories) {
            cachedCategories = await fetchCategories();

            if (!cachedCategories) return;
        }

        FluxDispatcher.dispatch({ type: "GIF_PICKER_TRENDING_FETCH_SUCCESS", ...cachedCategories });
    },

    handleGifSelect(id: string, query: string) {
        tenorFetch("/registershare", { id, q: query });
    },

    handleTrendingGifsFetch() {
        fetchTenorResults("/trending", 50)
            .then(results => {
                const items = mapToDiscordGifs(results);
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

        fetchTenorResults("/search", 20, { q: query })
            .then(results => {
                const items = mapToDiscordGifs(results);
                FluxDispatcher.dispatch(
                    items.length
                        ? { type: "INTEGRATION_QUERY_SUCCESS", integration, query, results: items }
                        : { type: "INTEGRATION_QUERY_FAILURE", integration, query }
                );
            })
            .catch(() => {
                FluxDispatcher.dispatch({ type: "INTEGRATION_QUERY_FAILURE", integration, query, results: [] });
            });
    }
});
