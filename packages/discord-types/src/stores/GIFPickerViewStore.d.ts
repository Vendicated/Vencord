import { FluxStore } from "..";

export type GIFMediaFormat = 1 | 2;
export type GIFSelectedFormat = "webm" | "tinywebp";

export interface GIFResultItem {
    id: string;
    url: string;
    src: string;
    gifSrc: string;
    width: number;
    height: number;
    format: GIFMediaFormat;
}

export interface GIFTrendingCategory {
    type: "Trending" | "Category";
    name: string;
    src: string;
    format: GIFMediaFormat;
}

export class GIFPickerViewStore extends FluxStore {
    getAnalyticsID(): string | null;
    getQuery(): string;
    getResultItems(): GIFResultItem[];
    getResultQuery(): string;
    getSelectedFormat(): GIFSelectedFormat;
    getSuggestions(): string[];
    getTrendingCategories(): GIFTrendingCategory[];
    getTrendingSearchTerms(): string[];
}
