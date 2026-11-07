import { FluxStore } from "..";

export class LayerStore extends FluxStore {
    hasLayers(): boolean;
    /** layer keys, e.g. "USER_SETTINGS", topmost last */
    getLayers(): string[];
}
