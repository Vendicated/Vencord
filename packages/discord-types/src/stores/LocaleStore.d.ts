import { FluxStore } from "..";

export class LocaleStore extends FluxStore {
    get locale(): string;
    get systemLocale(): string;
}
