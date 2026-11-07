import { FluxStore } from "..";

export class CategoryCollapseStore extends FluxStore {
    /** keyed by category channel id */
    getState(): Record<string, true>;
    isCollapsed(categoryId: string | null | undefined): boolean;
    getCollapsedCategories(): Record<string, true>;
    get version(): number;
}
