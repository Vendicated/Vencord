/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { find } from "@webpack";
import { RestAPI } from "@webpack/common";

const SEARCH_DELAY_MS = 500;

const settings = definePluginSettings({
    provider: {
        type: OptionType.SELECT,
        default: "discord",
        description: "Select your preferred GIF search engine provider.",
        options: [
            { label: "Discord Default", value: "discord", default: true },
            { label: "Klipy (Recommended)", value: "klipy" },
            { label: "Tenor", value: "tenor" },
            { label: "Giphy", value: "giphy" },
        ]
    }
});

const PROVIDER_NAMES: Record<string, string> = {
    klipy: "Klipy",
    tenor: "Tenor",
    giphy: "Giphy"
};

interface DiscordGifResult {
    id: string;
    title: string;
    url: string;
    src: string;
    gif_src: string;
    width: number;
    height: number;
    preview: string;
}

export default definePlugin({
    name: "GifProviderSelector",
    description: "Allows switching the Discord GIF search provider to alternative services such as Klipy, Tenor, or Giphy.",
    authors: [Devs.holygrole],
    settings,
    settingsAboutComponent: () => (
        <Paragraph className={Margins.bottom16}>
            Note: Tenor's current integration is scheduled for discontinuation by June 30th, 2026.
            Klipy, developed by former Tenor engineers, serves as a highly compatible and recommended alternative.
        </Paragraph>
    ),
    patches: [
        {
            find: "renderHeaderContent()",
            replacement: [
                {
                    // Intercept the search function to perform custom searches when a non-default provider is selected.
                    match: /(search\((\w+),\s*(\w+),\s*(\w+)\)\s*\{)/,
                    replace: "$1if($self.handleSearch(this,$2,$3,$4))return;"
                },
                {
                    // Inject custom results and query into the component props before rendering.
                    match: /(renderContent\(\)\s*\{\s*let\s*\{[\s\S]*?}\s*=\s*)(this\.props)/,
                    replace: "$1$self.getProps(this, $2)"
                },
                {
                    // Update the search bar placeholder to reflect the currently selected provider.
                    match: /(renderHeaderContent\(\).+)placeholder:\s*(\w+),\s*["']aria-label["']:\s*\2,/,
                    replace: '$1placeholder: $self.getPlaceholder($2),"aria-label": $self.getPlaceholder($2),'
                }
            ]
        }
    ],

    /**
     * Determines the appropriate placeholder text for the GIF search bar.
     */
    getPlaceholder(original: string) {
        const { provider } = settings.store;
        if (provider === "discord") return original;

        const name = PROVIDER_NAMES[provider] || "GIFs";
        return `Search ${name}`;
    },

    /**
     * Handles the search input by debouncing and executing custom API requests
     * if a non-default provider is active.
     */
    handleSearch(instance: any, query: string, _type: string, _s: any) {
        // If using Discord's default provider, allow the original logic to proceed.
        if (settings.store.provider === "discord") return false;

        if (instance._searchTimeout) {
            clearTimeout(instance._searchTimeout);
            delete instance._searchTimeout;
        }

        // Reset custom state if the query is cleared.
        if (query === "") {
            delete instance._customResults;
            delete instance._customQuery;
            delete instance._latestSearchQuery;
            return false;
        }

        // Switch the UI to search mode immediately to show the loading state/results.
        const GIFPickerResultTypes = find(m => m.GIFPickerResultTypes, { isIndirect: true })?.GIFPickerResultTypes;
        const searchType = GIFPickerResultTypes?.SEARCH ?? "Search";
        if (instance.state.resultType !== searchType) {
            instance.setState({ resultType: searchType });
        }

        instance._searchTimeout = setTimeout(() => {
            this.runCustomSearch(instance, query);
            delete instance._searchTimeout;
        }, SEARCH_DELAY_MS);

        return true;
    },

    /**
     * Executes the custom GIF search and updates the component instance with the results.
     */
    async runCustomSearch(instance: any, query: string) {
        instance._latestSearchQuery = query;
        const { provider } = settings.store;

        const data = await this.fetchGifs(query, provider);

        // Ensure we only update if this is still the most recent query.
        if (instance._latestSearchQuery !== query) return;

        instance._customResults = data;
        instance._customQuery = query;
        instance.forceUpdate();
    },

    /**
     * Merges custom search results into the component props if available.
     */
    getProps(instance: any, props: any) {
        if (instance._customResults) {
            return {
                ...props,
                resultItems: instance._customResults,
                resultQuery: instance._customQuery || props.resultQuery
            };
        }
        return props;
    },

    /**
     * Fetches GIF results from the Discord backend using the specified provider.
     */
    async fetchGifs(query: string, provider: string) {
        try {
            const response = await RestAPI.get({
                url: "/gifs/search",
                query: {
                    q: query,
                    media_format: "webm",
                    provider: provider
                }
            });

            if (!response.ok) {
                console.error(`[GifProviderSelector] API request failed for provider ${provider}:`, response.text);
                return [];
            }

            const results: DiscordGifResult[] = response.body;

            return results.map(item => ({
                id: item.id,
                url: item.url,
                src: item.src,
                width: item.width,
                height: item.height,
                format: 2 // VIDEO (webm)
            }));

        } catch (error) {
            console.error("[GifProviderSelector] Unexpected error during GIF fetch:", error);
            return [];
        }
    }
});
