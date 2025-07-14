import { FluxStore } from "..";

export class WindowStore extends FluxStore {
    isElementFullScreen(): boolean;
    isFocused(): boolean;
    windowSize(): Record<"width" | "height", number>;
}
